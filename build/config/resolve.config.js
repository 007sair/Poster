var path = require('path');
var dirVars = require('./dir-vars.config.js');

module.exports = {
    alias: {
        '@': path.resolve(dirVars.srcDir),
        'Lib': path.resolve(dirVars.srcDir, './js/lib'),
        'Mod': path.resolve(dirVars.srcDir, './js/mod'),
        'CSS': path.resolve(dirVars.srcDir, './css'),
        'vue$': 'vue/dist/vue.esm.js' 
    },
    extensions: ['.js', '.css', '.scss'],
}