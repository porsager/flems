const diffTimeout = 1.0
const diffEditCost = 4
const patchDeleteThreshold = 0.5
const patchMargin = 4
const matchMaxBits = 32
const matchThreshold = 0.5
const matchDistance = 1000

const nonAlphaNumericRegex_ = /[^a-zA-Z0-9]/
const whitespaceRegex_ = /\s/
const linebreakRegex_ = /[\r\n]/
const blanklineEndRegex_ = /\n\r?\n$/
const blanklineStartRegex_ = /^\r?\n\r?\n/

const DIFF_DELETE = -1
const DIFF_INSERT = 1
const DIFF_EQUAL = 0

function diffMain(text1, text2, optChecklines, optDeadline) {
  // Set a deadline by which time the diff must be complete.
  if (typeof optDeadline === 'undefined') {
    if (diffTimeout <= 0)
      optDeadline = Number.MAX_VALUE
    else
      optDeadline = (new Date()).getTime() + diffTimeout * 1000

  }
  const deadline = optDeadline

  if (text1 === text2) {
    if (text1) {
      return [
        [DIFF_EQUAL, text1]
      ]
    }
    return []
  }

  if (typeof optChecklines === 'undefined')
    optChecklines = true

  const checklines = optChecklines

  // Trim off common prefix (speedup).
  let commonlength = diffCommonPrefix(text1, text2)
  const commonprefix = text1.substring(0, commonlength)
  text1 = text1.substring(commonlength)
  text2 = text2.substring(commonlength)

  // Trim off common suffix (speedup).
  commonlength = diffCommonSuffix(text1, text2)
  const commonsuffix = text1.substring(text1.length - commonlength)
  text1 = text1.substring(0, text1.length - commonlength)
  text2 = text2.substring(0, text2.length - commonlength)

  // Compute the diff on the middle block.
  const diffs = diffCompute(text1, text2, checklines, deadline)

  // Restore the prefix and suffix.
  if (commonprefix)
    diffs.unshift([DIFF_EQUAL, commonprefix])

  if (commonsuffix)
    diffs.push([DIFF_EQUAL, commonsuffix])

  diffCleanupMerge(diffs)
  return diffs
}

function diffCompute(text1, text2, checklines, deadline) {
  let diffs

  if (!text1) {
    // Just add some text (speedup).
    return [
      [DIFF_INSERT, text2]
    ]
  }

  if (!text2) {
    // Just delete some text (speedup).
    return [
      [DIFF_DELETE, text1]
    ]
  }

  const longtext = text1.length > text2.length ? text1 : text2
  const shorttext = text1.length > text2.length ? text2 : text1
  const i = longtext.indexOf(shorttext)
  if (i !== -1) {
    // Shorter text is inside the longer text (speedup).
    diffs = [
      [DIFF_INSERT, longtext.substring(0, i)],
      [DIFF_EQUAL, shorttext],
      [DIFF_INSERT, longtext.substring(i + shorttext.length)]
    ]
    // Swap insertions for deletions if diff is reversed.
    if (text1.length > text2.length)
      diffs[0][0] = diffs[2][0] = DIFF_DELETE

    return diffs
  }

  if (shorttext.length === 1) {
    // Single character string.
    // After the previous speedup, the character can't be an equality.
    return [
      [DIFF_DELETE, text1],
      [DIFF_INSERT, text2]
    ]
  }

  // Check to see if the problem can be split in two.
  const hm = diffHalfMatch(text1, text2)
  if (hm) {
    // A half-match was found, sort out the return data.
    const text1A = hm[0]
    const text1B = hm[1]
    const text2A = hm[2]
    const text2B = hm[3]
    const midCommon = hm[4]
    // Send both pairs off for separate processing.
    const diffsA = diffMain(text1A, text2A, checklines, deadline)
    const diffsB = diffMain(text1B, text2B, checklines, deadline)
    // Merge the results.
    return diffsA.concat([
      [DIFF_EQUAL, midCommon]
    ], diffsB)
  }

  if (checklines && text1.length > 100 && text2.length > 100)
    return diffLinemode(text1, text2, deadline)


  return diffBisect(text1, text2, deadline)
}

function diffLinemode(text1, text2, deadline) {
  // Scan the text on a line-by-line basis first.
  const a = diffLinesToChars(text1, text2)
  text1 = a.chars1
  text2 = a.chars2
  const linearray = a.lineArray

  const diffs = diffMain(text1, text2, false, deadline)

  // Convert the diff back to original text.
  diffCharsToLines(diffs, linearray)
  // Eliminate freak matches (e.g. blank lines)
  diffCleanupSemantic(diffs)

  // Rediff any replacement blocks, this time character-by-character.
  // Add a dummy entry at the end.
  diffs.push([DIFF_EQUAL, ''])
  let pointer = 0
  let countDelete = 0
  let countInsert = 0
  let textDelete = ''
  let textInsert = ''
  while (pointer < diffs.length) {
    if (diffs[pointer][0] === DIFF_INSERT) {
      countInsert++
      textInsert += diffs[pointer][1]
    } else if (diffs[pointer][0] === DIFF_DELETE) {
      countDelete++
      textDelete += diffs[pointer][1]
    } else if (diffs[pointer][0] === DIFF_EQUAL) {
      // Upon reaching an equality, check for prior redundancies.
      if (countDelete >= 1 && countInsert >= 1) {
        // Delete the offending records and add the merged ones.
        diffs.splice(pointer - countDelete - countInsert,
          countDelete + countInsert)
        pointer = pointer - countDelete - countInsert
        const a = diffMain(textDelete, textInsert, false, deadline)
        for (let j = a.length - 1; j >= 0; j--)
          diffs.splice(pointer, 0, a[j])

        pointer = pointer + a.length
      }
      countInsert = 0
      countDelete = 0
      textDelete = ''
      textInsert = ''
    }
    pointer++
  }
  diffs.pop() // Remove the dummy entry at the end.

  return diffs
}

function diffBisect(text1, text2, deadline) {
  // Cache the text lengths to prevent multiple calls.
  const text1Length = text1.length
  const text2Length = text2.length
  const maxD = Math.ceil((text1Length + text2Length) / 2)
  const vOffset = maxD
  const vLength = 2 * maxD
  const v1 = new Array(vLength)
  const v2 = new Array(vLength)
  // Setting all elements to -1 is faster in Chrome & Firefox than mixing
  // integers and undefined.
  for (let x = 0; x < vLength; x++) {
    v1[x] = -1
    v2[x] = -1
  }
  v1[vOffset + 1] = 0
  v2[vOffset + 1] = 0
  const delta = text1Length - text2Length
  // If the total number of characters is odd, then the front path will collide
  // with the reverse path.
  const front = (delta % 2 !== 0)
  // Offsets for start and end of k loop.
  // Prevents mapping of space beyond the grid.
  let k1start = 0
  let k1end = 0
  let k2start = 0
  let k2end = 0
  for (let d = 0; d < maxD; d++) {
    // Bail out if deadline is reached.
    if ((new Date()).getTime() > deadline)
      break


    // Walk the front path one step.
    for (let k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
      const k1Offset = vOffset + k1
      let x1
      if (k1 === -d || (k1 !== d && v1[k1Offset - 1] < v1[k1Offset + 1]))
        x1 = v1[k1Offset + 1]
      else
        x1 = v1[k1Offset - 1] + 1

      let y1 = x1 - k1
      while (x1 < text1Length && y1 < text2Length &&
        text1.charAt(x1) === text2.charAt(y1)) {
        x1++
        y1++
      }
      v1[k1Offset] = x1
      if (x1 > text1Length) {
        // Ran off the right of the graph.
        k1end += 2
      } else if (y1 > text2Length) {
        // Ran off the bottom of the graph.
        k1start += 2
      } else if (front) {
        const k2Offset = vOffset + delta - k1
        if (k2Offset >= 0 && k2Offset < vLength && v2[k2Offset] !== -1) {
          // Mirror x2 onto top-left coordinate system.
          const x2 = text1Length - v2[k2Offset]
          if (x1 >= x2) {
            // Overlap detected.
            return diffBisectSplit(text1, text2, x1, y1, deadline)
          }
        }
      }
    }

    // Walk the reverse path one step.
    for (let k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
      const k2Offset = vOffset + k2
      let x2
      if (k2 === -d || (k2 !== d && v2[k2Offset - 1] < v2[k2Offset + 1]))
        x2 = v2[k2Offset + 1]
      else
        x2 = v2[k2Offset - 1] + 1

      let y2 = x2 - k2
      while (x2 < text1Length && y2 < text2Length &&
        text1.charAt(text1Length - x2 - 1) ===
        text2.charAt(text2Length - y2 - 1)) {
        x2++
        y2++
      }
      v2[k2Offset] = x2
      if (x2 > text1Length) {
        // Ran off the left of the graph.
        k2end += 2
      } else if (y2 > text2Length) {
        // Ran off the top of the graph.
        k2start += 2
      } else if (!front) {
        const k1Offset = vOffset + delta - k2
        if (k1Offset >= 0 && k1Offset < vLength && v1[k1Offset] !== -1) {
          const x1 = v1[k1Offset]
          const y1 = vOffset + x1 - k1Offset
          // Mirror x2 onto top-left coordinate system.
          x2 = text1Length - x2
          if (x1 >= x2) {
            // Overlap detected.
            return diffBisectSplit(text1, text2, x1, y1, deadline)
          }
        }
      }
    }
  }
  // Diff took too long and hit the deadline or
  // number of diffs equals number of characters, no commonality at all.
  return [
    [DIFF_DELETE, text1],
    [DIFF_INSERT, text2]
  ]
}

function diffBisectSplit(text1, text2, x, y, deadline) {
  const text1a = text1.substring(0, x)
  const text2a = text2.substring(0, y)
  const text1b = text1.substring(x)
  const text2b = text2.substring(y)

  // Compute both diffs serially.
  const diffs = diffMain(text1a, text2a, false, deadline)
  const diffsb = diffMain(text1b, text2b, false, deadline)

  return diffs.concat(diffsb)
}

function diffLinesToChars(text1, text2) {
  const lineArray = [] // e.g. lineArray[4] == 'Hello\n'
  const lineHash = {} // e.g. lineHash['Hello\n'] == 4

  // '\x00' is a valid character, but various debuggers don't like it.
  // So we'll insert a junk entry to avoid generating a null character.
  lineArray[0] = ''

  /**
   * Split a text into an array of strings.  Reduce the texts to a string of
   * hashes where each Unicode character represents one line.
   * Modifies linearray and linehash through being a closure.
   * @param {string} text String to encode.
   * @return {string} Encoded string.
   * @private
   */
  function diffLinesToCharsMunge(text) {
    let chars = ''
    // Walk the text, pulling out a substring for each line.
    // text.split('\n') would would temporarily double our memory footprint.
    // Modifying text would create many large strings to garbage collect.
    let lineStart = 0
    let lineEnd = -1
    // Keeping our own length variable is faster than looking it up.
    let lineArrayLength = lineArray.length
    while (lineEnd < text.length - 1) {
      lineEnd = text.indexOf('\n', lineStart)
      if (lineEnd === -1)
        lineEnd = text.length - 1

      const line = text.substring(lineStart, lineEnd + 1)
      lineStart = lineEnd + 1

      if (lineHash.hasOwnProperty ? lineHash.hasOwnProperty(line) :
        (lineHash[line] !== undefined)) {
        chars += String.fromCharCode(lineHash[line])
      } else {
        chars += String.fromCharCode(lineArrayLength)
        lineHash[line] = lineArrayLength
        lineArray[lineArrayLength++] = line
      }
    }
    return chars
  }

  const chars1 = diffLinesToCharsMunge(text1)
  const chars2 = diffLinesToCharsMunge(text2)
  return {
    chars1: chars1,
    chars2: chars2,
    lineArray: lineArray
  }
}

function diffCharsToLines(diffs, lineArray) {
  for (let x = 0; x < diffs.length; x++) {
    const chars = diffs[x][1]
    const text = []
    for (let y = 0; y < chars.length; y++)
      text[y] = lineArray[chars.charCodeAt(y)]

    diffs[x][1] = text.join('')
  }
}

function diffCommonPrefix(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 || text1.charAt(0) !== text2.charAt(0))
    return 0

  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  let pointermin = 0
  let pointermax = Math.min(text1.length, text2.length)
  let pointermid = pointermax
  let pointerstart = 0
  while (pointermin < pointermid) {
    if (text1.substring(pointerstart, pointermid) ===
      text2.substring(pointerstart, pointermid)) {
      pointermin = pointermid
      pointerstart = pointermin
    } else {
      pointermax = pointermid
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin)
  }
  return pointermid
}

function diffCommonSuffix(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 ||
    text1.charAt(text1.length - 1) !== text2.charAt(text2.length - 1))
    return 0

  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  let pointermin = 0
  let pointermax = Math.min(text1.length, text2.length)
  let pointermid = pointermax
  let pointerend = 0
  while (pointermin < pointermid) {
    if (text1.substring(text1.length - pointermid, text1.length - pointerend) ===
      text2.substring(text2.length - pointermid, text2.length - pointerend)) {
      pointermin = pointermid
      pointerend = pointermin
    } else {
      pointermax = pointermid
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin)
  }
  return pointermid
}

function diffCommonOverlap(text1, text2) {
  // Cache the text lengths to prevent multiple calls.
  const text1Length = text1.length
  const text2Length = text2.length
  // Eliminate the null case.
  if (text1Length === 0 || text2Length === 0)
    return 0

  // Truncate the longer string.
  if (text1Length > text2Length)
    text1 = text1.substring(text1Length - text2Length)
  else if (text1Length < text2Length)
    text2 = text2.substring(0, text1Length)

  const textLength = Math.min(text1Length, text2Length)
  // Quick check for the worst case.
  if (text1 === text2)
    return textLength


  // Start by looking for a single character match
  // and increase length until no match is found.
  // Performance analysis: http://neil.fraser.name/news/2010/11/04/
  let best = 0
  let length = 1
  while (true) { // eslint-disable-line
    const pattern = text1.substring(textLength - length)
    const found = text2.indexOf(pattern)
    if (found === -1)
      return best

    length += found
    if (found === 0 || text1.substring(textLength - length) ===
      text2.substring(0, length)) {
      best = length
      length++
    }
  }
}

function diffHalfMatch(text1, text2) {
  if (diffTimeout <= 0) {
    // Don't risk returning a non-optimal diff if we have unlimited time.
    return null
  }
  const longtext = text1.length > text2.length ? text1 : text2
  const shorttext = text1.length > text2.length ? text2 : text1
  if (longtext.length < 4 || shorttext.length * 2 < longtext.length)
    return null // Pointless.


  /**
   * Does a substring of shorttext exist within longtext such that the substring
   * is at least half the length of longtext?
   * Closure, but does not reference any external variables.
   * @param {string} longtext Longer string.
   * @param {string} shorttext Shorter string.
   * @param {number} i Start index of quarter length substring within longtext.
   * @return {Array.<string>} Five element Array, containing the prefix of
   *     longtext, the suffix of longtext, the prefix of shorttext, the suffix
   *     of shorttext and the common middle.  Or null if there was no match.
   * @private
   */
  function diffHalfMatchI(longtext, shorttext, i) {
    const seed = longtext.substring(i, i + Math.floor(longtext.length / 4))
    let j = -1
    let bestCommon = ''
      , bestLongtextA
      , bestLongtextB
      , bestShorttextA
      , bestShorttextB
    while ((j = shorttext.indexOf(seed, j + 1)) !== -1) {
      const prefixLength = diffCommonPrefix(longtext.substring(i),
        shorttext.substring(j))
      const suffixLength = diffCommonSuffix(longtext.substring(0, i),
        shorttext.substring(0, j))
      if (bestCommon.length < suffixLength + prefixLength) {
        bestCommon = shorttext.substring(j - suffixLength, j) +
          shorttext.substring(j, j + prefixLength)
        bestLongtextA = longtext.substring(0, i - suffixLength)
        bestLongtextB = longtext.substring(i + prefixLength)
        bestShorttextA = shorttext.substring(0, j - suffixLength)
        bestShorttextB = shorttext.substring(j + prefixLength)
      }
    }
    if (bestCommon.length * 2 >= longtext.length) {
      return [bestLongtextA, bestLongtextB,
        bestShorttextA, bestShorttextB, bestCommon
      ]
    }
    return null

  }

  // First check if the second quarter is the seed for a half-match.
  const hm1 = diffHalfMatchI(longtext, shorttext,
    Math.ceil(longtext.length / 4))
  // Check again based on the third quarter.
  const hm2 = diffHalfMatchI(longtext, shorttext,
    Math.ceil(longtext.length / 2))
  let hm
  if (!hm1 && !hm2)
    return null

  if (!hm2) {
    hm = hm1
  } else if (!hm1) {
    hm = hm2
  } else {
    // Both matched.  Select the longest.
    hm = hm1[4].length > hm2[4].length ? hm1 : hm2
  }

  // A half-match was found, sort out the return data.
  let text1A
    , text1B
    , text2A
    , text2B
  if (text1.length > text2.length) {
    text1A = hm[0]
    text1B = hm[1]
    text2A = hm[2]
    text2B = hm[3]
  } else {
    text2A = hm[0]
    text2B = hm[1]
    text1A = hm[2]
    text1B = hm[3]
  }
  const midCommon = hm[4]
  return [text1A, text1B, text2A, text2B, midCommon]
}

function diffCleanupSemantic(diffs) {
  let changes = false
  const equalities = [] // Stack of indices where equalities are found.
  let equalitiesLength = 0 // Keeping our own length const is faster in JS.
  /** @type {?string} */
  let lastEquality = null
  // Always equal to diffs[equalities[equalitiesLength - 1]][1]
  let pointer = 0 // Index of current position.
  // Number of characters that changed prior to the equality.
  let lengthInsertions1 = 0
  let lengthDeletions1 = 0
  // Number of characters that changed after the equality.
  let lengthInsertions2 = 0
  let lengthDeletions2 = 0
  while (pointer < diffs.length) {
    if (diffs[pointer][0] === DIFF_EQUAL) { // Equality found.
      equalities[equalitiesLength++] = pointer
      lengthInsertions1 = lengthInsertions2
      lengthDeletions1 = lengthDeletions2
      lengthInsertions2 = 0
      lengthDeletions2 = 0
      lastEquality = diffs[pointer][1]
    } else { // An insertion or deletion.
      if (diffs[pointer][0] === DIFF_INSERT)
        lengthInsertions2 += diffs[pointer][1].length
      else
        lengthDeletions2 += diffs[pointer][1].length

      // Eliminate an equality that is smaller or equal to the edits on both
      // sides of it.
      if (lastEquality && (lastEquality.length <=
          Math.max(lengthInsertions1, lengthDeletions1)) &&
        (lastEquality.length <= Math.max(lengthInsertions2,
          lengthDeletions2))) {
        // Duplicate record.
        diffs.splice(equalities[equalitiesLength - 1], 0, [DIFF_DELETE, lastEquality])
        // Change second copy to insert.
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT
        // Throw away the equality we just deleted.
        equalitiesLength--
        // Throw away the previous equality (it needs to be reevaluated).
        equalitiesLength--
        pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1
        lengthInsertions1 = 0 // Reset the counters.
        lengthDeletions1 = 0
        lengthInsertions2 = 0
        lengthDeletions2 = 0
        lastEquality = null
        changes = true
      }
    }
    pointer++
  }

  // Normalize the diff.
  if (changes)
    diffCleanupMerge(diffs)

  diffCleanupSemanticLossless(diffs)

  // Find any overlaps between deletions and insertions.
  // e.g: <del>abcxxx</del><ins>xxxdef</ins>
  //   -> <del>abc</del>xxx<ins>def</ins>
  // e.g: <del>xxxabc</del><ins>defxxx</ins>
  //   -> <ins>def</ins>xxx<del>abc</del>
  // Only extract an overlap if it is as big as the edit ahead or behind it.
  pointer = 1
  while (pointer < diffs.length) {
    if (diffs[pointer - 1][0] === DIFF_DELETE &&
      diffs[pointer][0] === DIFF_INSERT) {
      const deletion = diffs[pointer - 1][1]
      const insertion = diffs[pointer][1]
      const overlapLength1 = diffCommonOverlap(deletion, insertion)
      const overlapLength2 = diffCommonOverlap(insertion, deletion)
      if (overlapLength1 >= overlapLength2) {
        if (overlapLength1 >= deletion.length / 2 ||
          overlapLength1 >= insertion.length / 2) {
          // Overlap found.  Insert an equality and trim the surrounding edits.
          diffs.splice(pointer, 0, [DIFF_EQUAL, insertion.substring(0, overlapLength1)])
          diffs[pointer - 1][1] =
            deletion.substring(0, deletion.length - overlapLength1)
          diffs[pointer + 1][1] = insertion.substring(overlapLength1)
          pointer++
        }
      } else if (overlapLength2 >= deletion.length / 2 ||
          overlapLength2 >= insertion.length / 2) {
        // Reverse overlap found.
        // Insert an equality and swap and trim the surrounding edits.
        diffs.splice(pointer, 0, [DIFF_EQUAL, deletion.substring(0, overlapLength2)])
        diffs[pointer - 1][0] = DIFF_INSERT
        diffs[pointer - 1][1] =
            insertion.substring(0, insertion.length - overlapLength2)
        diffs[pointer + 1][0] = DIFF_DELETE
        diffs[pointer + 1][1] =
            deletion.substring(overlapLength2)
        pointer++
      }
      pointer++
    }
    pointer++
  }
}

function diffCleanupSemanticLossless(diffs) {

  /**
     * Given two strings, compute a score representing whether the internal
     * boundary falls on logical boundaries.
     * Scores range from 6 (best) to 0 (worst).
     * Closure, but does not reference any external variables.
     * @param {string} one First string.
     * @param {string} two Second string.
     * @return {number} The score.
     * @private
     */
  function diffCleanupSemanticScore_(one, two) {
    if (!one || !two) {
      // Edges are the best.
      return 6
    }

    // Each port of this function behaves slightly differently due to
    // subtle differences in each language's definition of things like
    // 'whitespace'.  Since this function's purpose is largely cosmetic,
    // the choice has been made to use each language's native features
    // rather than force total conformity.
    const char1 = one.charAt(one.length - 1)
    const char2 = two.charAt(0)
    const nonAlphaNumeric1 = char1.match(nonAlphaNumericRegex_)
    const nonAlphaNumeric2 = char2.match(nonAlphaNumericRegex_)
    const whitespace1 = nonAlphaNumeric1 &&
      char1.match(whitespaceRegex_)
    const whitespace2 = nonAlphaNumeric2 &&
      char2.match(whitespaceRegex_)
    const lineBreak1 = whitespace1 &&
      char1.match(linebreakRegex_)
    const lineBreak2 = whitespace2 &&
      char2.match(linebreakRegex_)
    const blankLine1 = lineBreak1 &&
      one.match(blanklineEndRegex_)
    const blankLine2 = lineBreak2 &&
      two.match(blanklineStartRegex_)

    if (blankLine1 || blankLine2) {
      // Five points for blank lines.
      return 5
    } else if (lineBreak1 || lineBreak2) {
      // Four points for line breaks.
      return 4
    } else if (nonAlphaNumeric1 && !whitespace1 && whitespace2) {
      // Three points for end of sentences.
      return 3
    } else if (whitespace1 || whitespace2) {
      // Two points for whitespace.
      return 2
    } else if (nonAlphaNumeric1 || nonAlphaNumeric2) {
      // One point for non-alphanumeric.
      return 1
    }
    return 0
  }

  let pointer = 1
  // Intentionally ignore the first and last element (don't need checking).
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] === DIFF_EQUAL &&
      diffs[pointer + 1][0] === DIFF_EQUAL) {
      // This is a single edit surrounded by equalities.
      let equality1 = diffs[pointer - 1][1]
      let edit = diffs[pointer][1]
      let equality2 = diffs[pointer + 1][1]

      // First, shift the edit as far left as possible.
      const commonOffset = diffCommonSuffix(equality1, edit)
      if (commonOffset) {
        const commonString = edit.substring(edit.length - commonOffset)
        equality1 = equality1.substring(0, equality1.length - commonOffset)
        edit = commonString + edit.substring(0, edit.length - commonOffset)
        equality2 = commonString + equality2
      }

      // Second, step character by character right, looking for the best fit.
      let bestEquality1 = equality1
      let bestEdit = edit
      let bestEquality2 = equality2
      let bestScore = diffCleanupSemanticScore_(equality1, edit) +
        diffCleanupSemanticScore_(edit, equality2)
      while (edit.charAt(0) === equality2.charAt(0)) {
        equality1 += edit.charAt(0)
        edit = edit.substring(1) + equality2.charAt(0)
        equality2 = equality2.substring(1)
        const score = diffCleanupSemanticScore_(equality1, edit) +
          diffCleanupSemanticScore_(edit, equality2)
        // The >= encourages trailing rather than leading whitespace on edits.
        if (score >= bestScore) {
          bestScore = score
          bestEquality1 = equality1
          bestEdit = edit
          bestEquality2 = equality2
        }
      }

      if (diffs[pointer - 1][1] !== bestEquality1) {
        // We have an improvement, save it back to the diff.
        if (bestEquality1) {
          diffs[pointer - 1][1] = bestEquality1
        } else {
          diffs.splice(pointer - 1, 1)
          pointer--
        }
        diffs[pointer][1] = bestEdit
        if (bestEquality2) {
          diffs[pointer + 1][1] = bestEquality2
        } else {
          diffs.splice(pointer + 1, 1)
          pointer--
        }
      }
    }
    pointer++
  }
}

function diffCleanupEfficiency(diffs) {
  let changes = false
  const equalities = [] // Stack of indices where equalities are found.
  let equalitiesLength = 0 // Keeping our own length const is faster in JS.
  /** @type {?string} */
  let lastEquality = null
  // Always equal to diffs[equalities[equalitiesLength - 1]][1]
  let pointer = 0 // Index of current position.
  // Is there an insertion operation before the last equality.
  let preIns = false
  // Is there a deletion operation before the last equality.
  let preDel = false
  // Is there an insertion operation after the last equality.
  let postIns = false
  // Is there a deletion operation after the last equality.
  let postDel = false
  while (pointer < diffs.length) {
    if (diffs[pointer][0] === DIFF_EQUAL) { // Equality found.
      if (diffs[pointer][1].length < diffEditCost &&
        (postIns || postDel)) {
        // Candidate found.
        equalities[equalitiesLength++] = pointer
        preIns = postIns
        preDel = postDel
        lastEquality = diffs[pointer][1]
      } else {
        // Not a candidate, and can never become one.
        equalitiesLength = 0
        lastEquality = null
      }
      postIns = postDel = false
    } else { // An insertion or deletion.
      if (diffs[pointer][0] === DIFF_DELETE)
        postDel = true
      else
        postIns = true


      /*
       * Five types to be split:
       * <ins>A</ins><del>B</del>XY<ins>C</ins><del>D</del>
       * <ins>A</ins>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<ins>C</ins>
       * <ins>A</del>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<del>C</del>
       */
      if (lastEquality && ((preIns && preDel && postIns && postDel) ||
          ((lastEquality.length < diffEditCost / 2) &&
            (preIns + preDel + postIns + postDel) === 3))) {
        // Duplicate record.
        diffs.splice(equalities[equalitiesLength - 1], 0, [DIFF_DELETE, lastEquality])
        // Change second copy to insert.
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT
        equalitiesLength-- // Throw away the equality we just deleted
        lastEquality = null
        if (preIns && preDel) {
          // No changes made which could affect previous entry, keep going.
          postIns = postDel = true
          equalitiesLength = 0
        } else {
          equalitiesLength-- // Throw away the previous equality.
          pointer = equalitiesLength > 0 ?
            equalities[equalitiesLength - 1] : -1
          postIns = postDel = false
        }
        changes = true
      }
    }
    pointer++
  }

  if (changes)
    diffCleanupMerge(diffs)

}

function diffCleanupMerge(diffs) {
  diffs.push([DIFF_EQUAL, '']) // Add a dummy entry at the end.
  let pointer = 0
  let countDelete = 0
  let countInsert = 0
  let textDelete = ''
  let textInsert = ''
  let commonlength
  while (pointer < diffs.length) {
    if (diffs[pointer][0] === DIFF_INSERT) {
      countInsert++
      textInsert += diffs[pointer][1]
      pointer++
    }
    if (diffs[pointer][0] === DIFF_DELETE) {
      countDelete++
      textDelete += diffs[pointer][1]
      pointer++
    }
    if (diffs[pointer][0] === DIFF_EQUAL) {
      // Upon reaching an equality, check for prior redundancies.
      if (countDelete + countInsert > 1) {
        if (countDelete !== 0 && countInsert !== 0) {
        // Factor out any common prefixies.
          commonlength = diffCommonPrefix(textInsert, textDelete)
          if (commonlength !== 0) {
            if ((pointer - countDelete - countInsert) > 0 &&
                diffs[pointer - countDelete - countInsert - 1][0] ===
                DIFF_EQUAL) {
              diffs[pointer - countDelete - countInsert - 1][1] +=
                  textInsert.substring(0, commonlength)
            } else {
              diffs.splice(0, 0, [DIFF_EQUAL,
                textInsert.substring(0, commonlength)
              ])
              pointer++
            }
            textInsert = textInsert.substring(commonlength)
            textDelete = textDelete.substring(commonlength)
          }
          // Factor out any common suffixies.
          commonlength = diffCommonSuffix(textInsert, textDelete)
          if (commonlength !== 0) {
            diffs[pointer][1] = textInsert.substring(textInsert.length -
                commonlength) + diffs[pointer][1]
            textInsert = textInsert.substring(0, textInsert.length -
                commonlength)
            textDelete = textDelete.substring(0, textDelete.length -
                commonlength)
          }
        }
        // Delete the offending records and add the merged ones.
        if (countDelete === 0) {
          diffs.splice(pointer - countInsert,
            countDelete + countInsert, [DIFF_INSERT, textInsert])
        } else if (countInsert === 0) {
          diffs.splice(pointer - countDelete,
            countDelete + countInsert, [DIFF_DELETE, textDelete])
        } else {
          diffs.splice(pointer - countDelete - countInsert,
            countDelete + countInsert, [DIFF_DELETE, textDelete], [DIFF_INSERT, textInsert])
        }
        pointer = pointer - countDelete - countInsert +
            (countDelete ? 1 : 0) + (countInsert ? 1 : 0) + 1
      } else if (pointer !== 0 && diffs[pointer - 1][0] === DIFF_EQUAL) {
        // Merge this equality with the previous one.
        diffs[pointer - 1][1] += diffs[pointer][1]
        diffs.splice(pointer, 1)
      } else {
        pointer++
      }
      countInsert = 0
      countDelete = 0
      textDelete = ''
      textInsert = ''
    }
  }
  if (diffs[diffs.length - 1][1] === '')
    diffs.pop() // Remove the dummy entry at the end.


  // Second pass: look for single edits surrounded on both sides by equalities
  // which can be shifted sideways to eliminate an equality.
  // e.g: A<ins>BA</ins>C -> <ins>AB</ins>AC
  let changes = false
  pointer = 1
  // Intentionally ignore the first and last element (don't need checking).
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] === DIFF_EQUAL &&
      diffs[pointer + 1][0] === DIFF_EQUAL) {
      // This is a single edit surrounded by equalities.
      if (diffs[pointer][1].substring(diffs[pointer][1].length -
          diffs[pointer - 1][1].length) === diffs[pointer - 1][1]) {
        // Shift the edit over the previous equality.
        diffs[pointer][1] = diffs[pointer - 1][1] +
          diffs[pointer][1].substring(0, diffs[pointer][1].length -
            diffs[pointer - 1][1].length)
        diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1]
        diffs.splice(pointer - 1, 1)
        changes = true
      } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) ===
        diffs[pointer + 1][1]) {
        // Shift the edit over the next equality.
        diffs[pointer - 1][1] += diffs[pointer + 1][1]
        diffs[pointer][1] =
          diffs[pointer][1].substring(diffs[pointer + 1][1].length) +
          diffs[pointer + 1][1]
        diffs.splice(pointer + 1, 1)
        changes = true
      }
    }
    pointer++
  }
  // If shifts were made, the diff needs reordering and another shift sweep.
  if (changes)
    diffCleanupMerge(diffs)

}

function diffText1(diffs) {
  const text = []
  for (let x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_INSERT)
      text[x] = diffs[x][1]

  }
  return text.join('')
}

function diffText2(diffs) {
  const text = []
  for (let x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_DELETE)
      text[x] = diffs[x][1]

  }
  return text.join('')
}

function matchMain(text, pattern, loc) {
  loc = Math.max(0, Math.min(loc, text.length))
  if (text === pattern) {
    // Shortcut (potentially not guaranteed by the algorithm)
    return 0
  } else if (!text.length) {
    // Nothing to match.
    return -1
  } else if (text.substring(loc, loc + pattern.length) === pattern) {
    // Perfect match at the perfect spot!  (Includes case of null pattern)
    return loc
  }
  // Do a fuzzy compare.
  return matchBitap(text, pattern, loc)

}

function matchAlphabet(pattern) {
  const s = {}
  for (let i = 0; i < pattern.length; i++)
    s[pattern.charAt(i)] = 0

  for (let i = 0; i < pattern.length; i++)
    s[pattern.charAt(i)] |= 1 << (pattern.length - i - 1)

  return s
}

function matchBitap(text, pattern, loc) {
  if (pattern.length > matchMaxBits)
    throw new Error('Pattern too long for this browser.')

  // Initialise the alphabet.
  const s = matchAlphabet(pattern)

  /**
   * Compute and return the score for a match with e errors and x location.
   * Accesses loc and pattern through being a closure.
   * @param {number} e Number of errors in match.
   * @param {number} x Location of match.
   * @return {number} Overall score for match (0.0 = good, 1.0 = bad).
   * @private
   */
  function matchBitapScore_(e, x) {
    const accuracy = e / pattern.length
    const proximity = Math.abs(loc - x)
    if (!matchDistance) {
      // Dodge divide by zero error.
      return proximity ? 1.0 : accuracy
    }
    return accuracy + (proximity / matchDistance)
  }

  // Highest score beyond which we give up.
  let scoreThreshold = matchThreshold
  // Is there a nearby exact match? (speedup)
  let bestLoc = text.indexOf(pattern, loc)
  if (bestLoc !== -1) {
    scoreThreshold = Math.min(matchBitapScore_(0, bestLoc), scoreThreshold)
    // What about in the other direction? (speedup)
    bestLoc = text.lastIndexOf(pattern, loc + pattern.length)
    if (bestLoc !== -1) {
      scoreThreshold =
          Math.min(matchBitapScore_(0, bestLoc), scoreThreshold)
    }
  }

  // Initialise the bit arrays.
  const matchmask = 1 << (pattern.length - 1)
  bestLoc = -1

  let binMin
    , binMid

  let binMax = pattern.length + text.length
  let lastRd
  for (let d = 0; d < pattern.length; d++) {
    // Scan for the best match; each iteration allows for one more error.
    // Run a binary search to determine how far from 'loc' we can stray at this
    // error level.
    binMin = 0
    binMid = binMax
    while (binMin < binMid) {
      if (matchBitapScore_(d, loc + binMid) <= scoreThreshold)
        binMin = binMid
      else
        binMax = binMid

      binMid = Math.floor((binMax - binMin) / 2 + binMin)
    }
    // Use the result from this iteration as the maximum for the next.
    binMax = binMid
    let start = Math.max(1, loc - binMid + 1)
    const finish = Math.min(loc + binMid, text.length) + pattern.length

    const rd = Array(finish + 2)
    rd[finish + 1] = (1 << d) - 1
    for (let j = finish; j >= start; j--) {
      // The alphabet (s) is a sparse hash, so the following line generates
      // warnings.
      const charMatch = s[text.charAt(j - 1)]
      if (d === 0) { // First pass: exact match.
        rd[j] = ((rd[j + 1] << 1) | 1) & charMatch
      } else { // Subsequent passes: fuzzy match.
        rd[j] = (((rd[j + 1] << 1) | 1) & charMatch) |
                (((lastRd[j + 1] | lastRd[j]) << 1) | 1) |
                lastRd[j + 1]
      }
      if (rd[j] & matchmask) {
        const score = matchBitapScore_(d, j - 1)
        // This match will almost certainly be better than any existing match.
        // But check anyway.
        if (score <= scoreThreshold) {
          // Told you so.
          scoreThreshold = score
          bestLoc = j - 1
          if (bestLoc > loc) {
            // When passing loc, don't exceed our current distance from loc.
            start = Math.max(1, 2 * loc - bestLoc)
          } else {
            // Already passed loc, downhill from here on in.
            break
          }
        }
      }
    }
    // No hope for a (better) match at greater error levels.
    if (matchBitapScore_(d + 1, loc) > scoreThreshold)
      break

    lastRd = rd
  }
  return bestLoc
}

function patchAddContext(patch, text) {
  if (text.length === 0)
    return

  let pattern = text.substring(patch.start2, patch.start2 + patch.length1)
  let padding = 0

  // Look for the first and last matches of pattern in text.  If two different
  // matches are found, increase the pattern length.
  while (text.indexOf(pattern) !== text.lastIndexOf(pattern) &&
    pattern.length < matchMaxBits - patchMargin -
    patchMargin) {
    padding += patchMargin
    pattern = text.substring(patch.start2 - padding,
      patch.start2 + patch.length1 + padding)
  }
  // Add one chunk for good luck.
  padding += patchMargin

  // Add the prefix.
  const prefix = text.substring(patch.start2 - padding, patch.start2)
  if (prefix)
    patch.diffs.unshift([DIFF_EQUAL, prefix])

  // Add the suffix.
  const suffix = text.substring(patch.start2 + patch.length1,
    patch.start2 + patch.length1 + padding)
  if (suffix)
    patch.diffs.push([DIFF_EQUAL, suffix])


  // Roll back the start points.
  patch.start1 -= prefix.length
  patch.start2 -= prefix.length
  // Extend the lengths.
  patch.length1 += prefix.length + suffix.length
  patch.length2 += prefix.length + suffix.length
}

export function diff(a, optB, optC) {
  let text1
    , diffs
  if (typeof a === 'string' && typeof optB === 'string' &&
    typeof optC === 'undefined') {
    // Method 1: text1, text2
    // Compute diffs from text1 and text2.
    text1 = /** @type {string} */ (a)
    diffs = diffMain(text1, optB, true, undefined)
    if (diffs.length > 2) {
      diffCleanupSemantic(diffs)
      diffCleanupEfficiency(diffs)
    }
  }

  const patches = []
  let patch = patchObj()
  let patchDiffLength = 0 // Keeping our own length const is faster in JS.
  let charCount1 = 0 // Number of characters into the text1 string.
  let charCount2 = 0 // Number of characters into the text2 string.
  // Start with text1 (prepatchText) and apply the diffs until we arrive at
  // text2 (postpatchText).  We recreate the patches one by one to determine
  // context info.
  let prepatchText = text1
  let postpatchText = text1
  for (let x = 0; x < diffs.length; x++) {
    const diffType = diffs[x][0]
    const diffText = diffs[x][1]

    if (!patchDiffLength && diffType !== DIFF_EQUAL) {
      // A new patch starts here.
      patch.start1 = charCount1
      patch.start2 = charCount2
    }

    if (diffType === DIFF_INSERT) {
      patch.diffs[patchDiffLength++] = diffs[x]
      patch.length2 += diffText.length
      postpatchText = postpatchText.substring(0, charCount2) + diffText +
          postpatchText.substring(charCount2)
    }
    if (diffType === DIFF_DELETE) {
      patch.length1 += diffText.length
      patch.diffs[patchDiffLength++] = diffs[x]
      postpatchText = postpatchText.substring(0, charCount2) +
          postpatchText.substring(charCount2 +
            diffText.length)
    }
    if (diffType === DIFF_EQUAL) {
      if (diffText.length <= 2 * patchMargin &&
          patchDiffLength && diffs.length !== x + 1) {
        // Small equality inside a patch.
        patch.diffs[patchDiffLength++] = diffs[x]
        patch.length1 += diffText.length
        patch.length2 += diffText.length
      } else if (diffText.length >= 2 * patchMargin) {
        // Time for a new patch.
        if (patchDiffLength) {
          patchAddContext(patch, prepatchText)
          patches.push(patch)
          patch = patchObj()
          patchDiffLength = 0
          // Unlike Unidiff, our patch lists have a rolling context.
          // http://code.google.com/p/google-diff-match-patch/wiki/Unidiff
          // Update prepatch text & pos to reflect the application of the
          // just completed patch.
          prepatchText = postpatchText
          charCount1 = charCount2
        }
      }
    }

    // Update the current character count.
    if (diffType !== DIFF_INSERT)
      charCount1 += diffText.length

    if (diffType !== DIFF_DELETE)
      charCount2 += diffText.length

  }
  // Pick up the leftover patch if not empty.
  if (patchDiffLength) {
    patchAddContext(patch, prepatchText)
    patches.push(patch)
  }

  return serialize(patches)
}

function patchDeepCopy(patches) {
  // Making deep copies is hard in JavaScript.
  const patchesCopy = []
  for (let x = 0; x < patches.length; x++) {
    const patch = patches[x]
    const patchCopy = patchObj()
    patchCopy.diffs = []
    for (let y = 0; y < patch.diffs.length; y++)
      patchCopy.diffs[y] = patch.diffs[y].slice()

    patchCopy.start1 = patch.start1
    patchCopy.start2 = patch.start2
    patchCopy.length1 = patch.length1
    patchCopy.length2 = patch.length2
    patchesCopy[x] = patchCopy
  }
  return patchesCopy
}

function diffLevenshtein(diffs) {
  let levenshtein = 0
  let insertions = 0
  let deletions = 0
  for (let x = 0; x < diffs.length; x++) {
    const op = diffs[x][0]
    const data = diffs[x][1]
    if (op === DIFF_INSERT) {
      insertions += data.length
    } else if (op === DIFF_DELETE) {
      deletions += data.length
    } else if (op === DIFF_EQUAL) {
      // A deletion and an insertion is one substitution.
      levenshtein += Math.max(insertions, deletions)
      insertions = 0
      deletions = 0
    }
  }
  levenshtein += Math.max(insertions, deletions)
  return levenshtein
}

export function patch(text, patches) {
  patches = deserialize(patches)

  if (patches.length === 0)
    return [text, []]


  // Deep copy the patches so that no changes are made to originals.
  patches = patchDeepCopy(patches)

  const nullPadding = patchAddPadding(patches)
  text = nullPadding + text + nullPadding

  patchSplitMax(patches)
  // delta keeps track of the offset between the expected and actual location
  // of the previous patch.  If there are patches expected at positions 10 and
  // 20, but the first patch was found at 12, delta is 2 and the second patch
  // has an effective expected position of 22.
  let delta = 0
  const results = []
  for (let x = 0; x < patches.length; x++) {
    const expectedLoc = patches[x].start2 + delta
    const text1 = diffText1(patches[x].diffs)
    let startLoc
    let endLoc = -1
    if (text1.length > matchMaxBits) {
      // patchSplitMax will only provide an oversized pattern in the case of
      // a monster delete.
      startLoc = matchMain(text, text1.substring(0, matchMaxBits),
        expectedLoc)
      if (startLoc !== -1) {
        endLoc = matchMain(text,
          text1.substring(text1.length - matchMaxBits),
          expectedLoc + text1.length - matchMaxBits)
        if (endLoc === -1 || startLoc >= endLoc) {
          // Can't find valid trailing context.  Drop this patch.
          startLoc = -1
        }
      }
    } else {
      startLoc = matchMain(text, text1, expectedLoc)
    }
    if (startLoc === -1) {
      // No match found.  :(
      results[x] = false
      // Subtract the delta for this failed patch from subsequent patches.
      delta -= patches[x].length2 - patches[x].length1
    } else {
      // Found a match.  :)
      results[x] = true
      delta = startLoc - expectedLoc
      let text2
      if (endLoc === -1)
        text2 = text.substring(startLoc, startLoc + text1.length)
      else
        text2 = text.substring(startLoc, endLoc + matchMaxBits)

      if (text1 === text2) {
        // Perfect match, just shove the replacement text in.
        text = text.substring(0, startLoc) +
          diffText2(patches[x].diffs) +
          text.substring(startLoc + text1.length)
      } else {
        // Imperfect match.  Run a diff to get a framework of equivalent
        // indices.
        const diffs = diffMain(text1, text2, false, undefined)
        if (text1.length > matchMaxBits &&
          diffLevenshtein(diffs) / text1.length >
          patchDeleteThreshold) {
          // The end points match, but the content is unacceptably bad.
          results[x] = false
        } else {
          diffCleanupSemanticLossless(diffs)
          let index1 = 0
          let index2
          for (let y = 0; y < patches[x].diffs.length; y++) {
            const mod = patches[x].diffs[y]
            if (mod[0] !== DIFF_EQUAL) // eslint-disable-line
              index2 = diffXIndex(diffs, index1)

            if (mod[0] === DIFF_INSERT) { // eslint-disable-line
              text = text.substring(0, startLoc + index2) + mod[1] +
                text.substring(startLoc + index2)
            } else if (mod[0] === DIFF_DELETE) { // Deletion
              text = text.substring(0, startLoc + index2) +
                text.substring(startLoc + diffXIndex(diffs,
                  index1 + mod[1].length))
            }
            if (mod[0] !== DIFF_DELETE)
              index1 += mod[1].length

          }
        }
      }
    }
  }
  // Strip the padding off.
  text = text.substring(nullPadding.length, text.length - nullPadding.length)
  return [text, results]
}

function diffXIndex(diffs, loc) {
  let chars1 = 0
  let chars2 = 0
  let lastChars1 = 0
  let lastChars2 = 0
  let x
  for (x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_INSERT) { // Equality or deletion.
      chars1 += diffs[x][1].length
    }
    if (diffs[x][0] !== DIFF_DELETE) { // Equality or insertion.
      chars2 += diffs[x][1].length
    }
    if (chars1 > loc) { // Overshot the location.
      break
    }
    lastChars1 = chars1
    lastChars2 = chars2
  }
  // Was the location was deleted?
  if (diffs.length !== x && diffs[x][0] === DIFF_DELETE)
    return lastChars2

  // Add the remaining character length.
  return lastChars2 + (loc - lastChars1)
}

function patchAddPadding(patches) {
  const paddingLength = patchMargin
  let nullPadding = ''
  for (let x = 1; x <= paddingLength; x++)
    nullPadding += String.fromCharCode(x)


  // Bump all the patches forward.
  for (let x = 0; x < patches.length; x++) {
    patches[x].start1 += paddingLength
    patches[x].start2 += paddingLength
  }

  // Add some padding on start of first diff.
  let patch = patches[0]
  let diffs = patch.diffs
  if (diffs.length === 0 || diffs[0][0] !== DIFF_EQUAL) {
    // Add nullPadding equality.
    diffs.unshift([DIFF_EQUAL, nullPadding])
    patch.start1 -= paddingLength // Should be 0.
    patch.start2 -= paddingLength // Should be 0.
    patch.length1 += paddingLength
    patch.length2 += paddingLength
  } else if (paddingLength > diffs[0][1].length) {
    // Grow first equality.
    const extraLength = paddingLength - diffs[0][1].length
    diffs[0][1] = nullPadding.substring(diffs[0][1].length) + diffs[0][1]
    patch.start1 -= extraLength
    patch.start2 -= extraLength
    patch.length1 += extraLength
    patch.length2 += extraLength
  }

  // Add some padding on end of last diff.
  patch = patches[patches.length - 1]
  diffs = patch.diffs
  if (diffs.length === 0 || diffs[diffs.length - 1][0] !== DIFF_EQUAL) {
    // Add nullPadding equality.
    diffs.push([DIFF_EQUAL, nullPadding])
    patch.length1 += paddingLength
    patch.length2 += paddingLength
  } else if (paddingLength > diffs[diffs.length - 1][1].length) {
    // Grow last equality.
    const extraLength = paddingLength - diffs[diffs.length - 1][1].length
    diffs[diffs.length - 1][1] += nullPadding.substring(0, extraLength)
    patch.length1 += extraLength
    patch.length2 += extraLength
  }

  return nullPadding
}

function patchSplitMax(patches) {
  const patchSize = matchMaxBits
  for (let x = 0; x < patches.length; x++) {
    if (patches[x].length1 <= patchSize)
      continue // eslint-disable-line

    const bigpatch = patches[x]
    // Remove the big old patch.
    patches.splice(x--, 1)
    let start1 = bigpatch.start1
    let start2 = bigpatch.start2
    let precontext = ''
    while (bigpatch.diffs.length !== 0) {
      // Create one of several smaller patches.
      const patch = patchObj()
      let empty = true
      patch.start1 = start1 - precontext.length
      patch.start2 = start2 - precontext.length
      if (precontext !== '') {
        patch.length1 = patch.length2 = precontext.length
        patch.diffs.push([DIFF_EQUAL, precontext])
      }
      while (bigpatch.diffs.length !== 0 &&
        patch.length1 < patchSize - patchMargin) {
        const diffType = bigpatch.diffs[0][0]
        let diffText = bigpatch.diffs[0][1]
        if (diffType === DIFF_INSERT) {
          // Insertions are harmless.
          patch.length2 += diffText.length
          start2 += diffText.length
          patch.diffs.push(bigpatch.diffs.shift())
          empty = false
        } else if (diffType === DIFF_DELETE && patch.diffs.length === 1 &&
          patch.diffs[0][0] === DIFF_EQUAL &&
          diffText.length > 2 * patchSize) {
          // This is a large deletion.  Let it pass in one chunk.
          patch.length1 += diffText.length
          start1 += diffText.length
          empty = false
          patch.diffs.push([diffType, diffText])
          bigpatch.diffs.shift()
        } else {
          // Deletion or equality.  Only take as much as we can stomach.
          diffText = diffText.substring(0,
            patchSize - patch.length1 - patchMargin)
          patch.length1 += diffText.length
          start1 += diffText.length
          if (diffType === DIFF_EQUAL) {
            patch.length2 += diffText.length
            start2 += diffText.length
          } else {
            empty = false
          }
          patch.diffs.push([diffType, diffText])
          if (diffText === bigpatch.diffs[0][1]) {
            bigpatch.diffs.shift()
          } else {
            bigpatch.diffs[0][1] =
              bigpatch.diffs[0][1].substring(diffText.length)
          }
        }
      }
      // Compute the head context for the next patch.
      precontext = diffText2(patch.diffs)
      precontext =
        precontext.substring(precontext.length - patchMargin)
      // Append the end context for this patch.
      const postcontext = diffText1(bigpatch.diffs)
        .substring(0, patchMargin)
      if (postcontext !== '') {
        patch.length1 += postcontext.length
        patch.length2 += postcontext.length
        if (patch.diffs.length !== 0 &&
          patch.diffs[patch.diffs.length - 1][0] === DIFF_EQUAL)
          patch.diffs[patch.diffs.length - 1][1] += postcontext
        else
          patch.diffs.push([DIFF_EQUAL, postcontext])

      }
      if (!empty)
        patches.splice(++x, 0, patch)

    }
  }
}

function patchObj() {
  return {
    diffs: [],
    start1: null,
    start2: null,
    length1: 0,
    length2: 0
  }
}

function serialize(diff) {
  return diff.length
    ? diff.map(d => d.diffs.concat([
      d.length1,
      d.length2,
      d.start1,
      d.start2
    ]))
    : undefined
}

function deserialize(diff) {
  return diff.map(d => {
    return {
      diffs: Array.isArray(d[0])
        ? d.slice(0, -4)
        : [
          [0, d[1]],
          [d[0], d[2]],
          [0, d[3]]
        ],
      length1: d[d.length - 4],
      length2: d[d.length - 3],
      start1: d[d.length - 2],
      start2: d[d.length - 1]
    }
  })
}
