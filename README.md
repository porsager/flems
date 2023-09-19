# Flems 

> As seen on [Flems.io](https://flems.io)

Flems is a static web app - no strings attached - browser code playground.
It's great for documentation, examples, presentations, issues and what not.

<p align="center">
    <a href="https://flems.io">
        <img src="https://a.flems.io/intro.gif" alt="Flems example">
    </a>
</p>

## Getting started
Just load a single file [`flems.html`](https://flems.io/flems.html) in a script tag to get started. - [why should i load an .html file as a script tag?](#html-script-tag)

``` html
<script src="https://flems.io/flems.html" type="text/javascript" charset="utf-8"></script>
<script>
const flems = Flems(document.body, {
    files: [{
        name: 'app.js',
        content: 'm.render(document.body, m("h1", "Hello world"))'
    }],
    links: [{
        name: 'mithril',
        type: 'script',
        url: 'https://unpkg.com/mithril'
    }]
})
</script>
```

[Flems.io of the above](https://flems.io/#0=N4IgzgpgNhDGAuEAmIBcIB0ALeBbKIANCAGYCWMYaA2qAHYCGuEamO+RIsA9nYn6wA8WAIwA+ADp0ABNIAqWMmGlLpAMRi5lZGRohapggPSjJdQUjIA3FUgC8E0prCOzxy1bcAHM7L1aVZQgGMAoAT2l9ACNkJGQVGSRuWABXZj4GeDJeSPhYDALDIx9DMFgAJzIveGkwctgHEBx4LzBUIyMSZwxszu72KEdpeDCvCEbEAA94IwArBisQiqr4IdgsBnLIeEaU+BIAWgAOV2Myyuq3c5WxaSlZWQB3HSTHjH8wAAou-TBCaWA9wewPIlFQ0loQOB0OkjGY4IA5AwvF4MLMwAjCFCYQ8eHwIHxEbgMOUCXFyp8JFIqfAkql0vAMFFuEgwljqRI8JSmiJHP9HAAJaBQbjSR7ccpQJCOACUVLoMoR2OBAF8ALpYmQ4qA6ADWbQhgK1OIecIgRLI8CwlSgmOVOJGY0R6LtxpN0hSksRzVa7SMKToXl1AHMMDxcEZcJbrRQlW7VWrsSq5eYjNdLpxIDAENk6FR0CJUAAmAAsIBVhHoTBY6DRVGIeP48FY5crIDNrDDYHrXF4TdYon+XgBQNwm2DOgO8G4XnBAGYAAxeSYAbiBU3gBwYOuDdHBsAJiHKa61JD7BxITHC4LADDzB0glRIJ5V1LoAGIfgEjbIx+UJ3u0hFkukzSCWIEnrIWAQGQwY4OC4EQUCzKTA+GyvOCC7SFhwHLtI-5RAwnwLoQJEkRgc4AKwpiq5ZqiqQA)

## Contents

Content is added to the `files` and `links` arrays in options. 

## `.files`
The files array should contains objects with the following structure
```js
{
    name        : String, 
    compiler    : String | Function,
    content     : String
}
```
The following extensions are handled for files (others are ignored)
- `.html` - Only the first html file is used (others are ignored)
- `.js`
- `.css`
- `.ts` - Will be compiled by typescript
- `.ls` - Will be compiled by livescript

The following compilers are currently only avaible for js files:
- `ts` (typescript)
- `ls` (livescript)
- `babel`

It is also possible to supply a function that receives the file and returns a promise which resolves to an object with `code` and `map` eg.
```js
function compile(file) {
    return new Promise(resolve => {
        return {
            code: file.content.replace(/var /g, 'const '), // Don't do this
            map: null // The JSON for a sourcemap
        }
    })
}
```

## `.links`
The links array should contain objects with the following structure
```js
{
    name        : String,
    type        : String, // js | css
    url         : String
}
```
If the url supports CORS, Flems will open files shorther than 200.000 chars in the editor, if not they'll simply be linked to.

## Options

Flems is customizable to fit your need. If you don't want the toolbar or don't care for console output you can easily hide that away. The following options with their defaults are available:

```js
{
    middle          : 50,
    selected        : '.js',
    color           : 'rgb(38,50,56)',
    theme           : 'material', // and 'none' or 'default'
    resizeable      : true,
    editable        : true,
    toolbar         : true,
    fileTabs        : true,
    linkTabs        : true,
    shareButton     : true,
    reloadButton    : true,
    console         : true,
    autoReload      : true,
    autoReloadDelay : 400,
    autoHeight      : false
}
```

## Methods

There are a few methods exposed to control the Flems runtime:

### `.reload()`
Reloads the runtime page

### `.focus()`
Set focus in the editor for the currently selected file

### `.redraw()`
Call this if you have changed the size of the container or changed eg. `display: none` to `display: block`

## Bundling Flems

Bundling Flems doesn't really make sense. Flems uses an `iframe` as a runtime that needs to be pointed at a URL containing specific code. This is currently done by using the included script both as the required module `Flems` and as the `html` file src for the iframe. If for some reason you'd still want to bundle Flems, be aware you'll either need to make the same setup or point to a Flems specific `runtime.html` file resulting in the same amount of requires. Feel free to create an [issue](https://github.com/porsager/flems/issues) if you need some pointers for doing that.

## Tools used to build Flems

### [Mithril](https://mithril.js.org)
Mithril is one of few Javascript frameworks that embraces Javascript - the good parts, it's a small package of [8kb] with everything required to make your web app work.

### [BSS](https://github.com/porsager/bss)
BSS is a css-in-js framework taking components to the extreme. No more defining intermediate class names for no reason, just focus on building your components using the javascript and the css properties you know. - The perfect companion for mithril.

### [Wright](https://github.com/porsager/wright)
Wright is a developmet environment taking away the hassle of setting up a dev server and running a live reload environment. It even hot reloads JS functions and CSS with no specific app modifications needed.

### [CodeMirror](https://codemirror.net/)
CodeMirror powers the editor in Flems, and ensures it works great on any device.

### [Rollup](https://rollupjs.org/)
Rollup is a module bundler for JavaScript which compiles small pieces of code into something larger and more complex, such as a library or application.

## Html script tag

To allow you to use Flems with only a single file to be required the javascript and the html for the iframe runtime has been merged into a single file disguised as `flems.html`. [It works](https://github.com/porsager/flems/blob/master/scripts/standalone.js) by having the javascript code contained in html comments and the html code contained in javascript comments. In that way if loaded like javascript the html is ignored and when loaded as html the javascript part is ignored.

## Thanks

The [mithril community](https://gitter.im/mithriljs/mithril.js) has been an amazing help and source for feedback - Thanks to all of you!

