const shell = require("shelljs")
const dirVars = require('../config/dir-vars.config.js')

shell.rm("-rf", dirVars.distDir)
console.log(`> 已删除目录：${dirVars.distDir}`)