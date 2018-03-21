const SVGO = require('svgo')

const svgo = new SVGO()

module.exports = function svg() {
  return {
    name: 'svg',
    transform: (code, id) => {
      if (id.endsWith('.svg')) {
        return svgo.optimize(code).then(result => ({
          map: { mappings: '' },
          code: 'export default ' + JSON.stringify(result.data)
        }))
      }
    }
  }
}
