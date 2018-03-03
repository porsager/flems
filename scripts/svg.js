const cp = require('child_process')

module.exports = function svg() {
  return {
    name: 'svg',
    transform: (code, id) => {
      if (id.endsWith('.svg')) {
        return {
          map: { mappings: '' },
          code: 'export default ' + JSON.stringify(cp.execSync(
            'svgcleaner ' + id + ' -c', {
              encoding: 'utf8'
            }
          ))
        }
      }
    }
  }
}
