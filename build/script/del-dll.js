var fs = require('fs');
var rimraf = require('rimraf');

//此文件通过npm run dll创建
rimraf('manifest.json', fs, function () {
    console.log('manifest.json已删除');
});

rimraf('dist/js/vendor.min.js', fs, function () {
    console.log('vendor.min.js已删除');
});
