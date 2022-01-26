const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

module.exports = PersistentUndo = {

  config: {
    undoFolder: {
      description: "Name of folder for storing undo files (relative to the atom configDirPath)",
      order: 1,
      type: "string",
      default: "persistent-undo",
    }
  },

  activate() {
    console.log('persistent-undo activated')
    return atom.workspace.observeTextEditors( (editor) => {
      let file_path = editor.buffer?.file?.path

      if (file_path) {
        let undoFolder = atom.config.get('persistent-undo.undoFolder')
        let undoFilePath = path.join(atom.getConfigDirPath(), undoFolder, file_path).replace(/(?<=\\.):/, '')

        editor.buffer.onWillSave( () => {
          let dirPath = path.dirname(undoFilePath)
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, {recursive: true, mode: 0x1ed})
          }
          let json = JSON.stringify(editor.buffer.historyProvider.serialize({}))
          let gzipped = zlib.gzipSync(json)
          return fs.writeFileSync(undoFilePath, gzipped)
        })

        if (fs.existsSync(undoFilePath)) {
          return fs.readFile(undoFilePath, (error, data) => {
            if (error) {
              throw error
            }
            let gunzipped = zlib.gunzipSync(data).toString('utf8')
            var state = JSON.parse(gunzipped)
            if (state) {
              return editor.buffer.historyProvider.deserialize(state)
            }
          })
        }

      }
    })
  },

  deactivate() {},

}
