const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { CompositeDisposable } = require('atom')

module.exports = {

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

    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(
      atom.workspace.observeTextEditors( (editor) => {
        let buffer = editor.buffer
        let file_path = buffer?.file?.path
        if (file_path) {
          if (file_path.split('\\').slice(-1)[0] == 'persistent-undo.js') {
            return
          }

          let undoFolder = atom.config.get('persistent-undo.undoFolder')
          let undoFilePath = path.join(atom.getConfigDirPath(), undoFolder, file_path).replace(/(?<=\\.):/, '')
          let history = buffer.historyProvider

          this.subscriptions.add(
            buffer.onWillSave( () => {
              let dirPath = path.dirname(undoFilePath)
              if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, {recursive: true, mode: 0x1ed})
              }
              let backup = history.serialize({})

              !['redo', 'undo'].forEach(action => {
                let stack = `${action}Stack`
                let historyStack = history[stack]
                let backupStack = backup[stack]

                historyStack.forEach((historyTransaction, t) => {
                  let backupTransaction = backupStack[t]

                  !['After', 'Before'].forEach(stage => {
                    let marker = `markerSnapshot${stage}`
                    let historyMarker = historyTransaction[marker]
                    let backupMarker = (backupTransaction[marker] = {})

                    Object.entries(historyMarker).forEach( ([i, historySnapshot]) => {
                      var backupSnapshot = (backupMarker[i] = {})

                      Object.entries(historySnapshot).forEach( ([r, historyRange]) => {
                        backupSnapshot[r] = {range: historyRange.range}
                      })

                    })

                  })
                })

              })

              var json = JSON.stringify(backup)
              let gzipped = zlib.gzipSync(json)
              fs.writeFileSync(undoFilePath, gzipped)
            })
          )

          if (fs.existsSync(undoFilePath)) {
            fs.readFile(undoFilePath, (error, data) => {
              if (error) {
                throw error
              }
              let gunzipped = zlib.gunzipSync(data).toString('utf8')
              var state = JSON.parse(gunzipped)
              if (state) {
                history.deserialize(state)
              }
            })
          }

        }
      })
    )
  },

  deactivate() {
    this.subscriptions.dispose()
  },

}
