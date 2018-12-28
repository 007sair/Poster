/**
 * Tools
 */

export default {

    // 判断类型
    typeof(obj) {
        if (obj == null) return String(obj);
        var class2type = {};
        "Boolean Number String Function Array Date RegExp Object Error".split(" ").forEach(function (e, i) {
            class2type["[object " + e + "]"] = e.toLowerCase();
        });
        return typeof obj === "object" || typeof obj === "function" ?
            class2type[Object.prototype.toString.call(obj)] || "object" :
            typeof obj;
    },

    /**
     * 获取唯一uid
     * @return {String} 一串唯一的字符
     */
    uuid() {
        var d = new Date().getTime()
        var uuid = "xxxxxxxxxxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
            /[xy]/g,
            function (c) {
                var r = (d + Math.random() * 16) % 16 | 0
                d = Math.floor(d / 16)
                return (c == "x" ? r : (r & 0x3) | 0x8).toString(16)
            }
        );
        return uuid
    },

    /**
     * 异步加载图片，返回img对象
     * @param {String}   url         图片地址
     * @param {Boolean}  is_revoke   是否删除blob对象，默认不删除
     * @param {Boolean}  is_cors     是否对此元素的CORS请求设置凭据标志
     * @return {ImageObject}        img对象
     */
    loadImage(url, is_revoke = false, is_cors = true) {
        return new Promise((resolve, reject) => {
            if (typeof url !== 'string') {
                throw new TypeError('url 类型错误')
            }
            var img = new Image()
            if (is_cors) {
                img.crossOrigin = 'Anonymous'
            }

            /**
             * 注意：ios低版本，v11.0以下当我们创建Image对象，在onload一个base64的图片时，出直接跳到onerror中
             * 具体原因：Browsers can have some limitation on data URI size
             * https://stackoverflow.com/questions/21728604/ie10-base64-encoded-image-load-error
             * Tips: 为了性能，建议使用完后移除这个对象。window.URL.revokeObjectURL(objectURL);
             * https://juejin.im/entry/5937c98eac502e0068cf31ae
             */
            var objectURL = null
            if (url.match(/^data:(.*);base64,/) && window.URL && URL.createObjectURL) {
                objectURL = URL.createObjectURL(this.dataURL2blob(url))
                url = objectURL
            }

            img.onload = () => {
                if (is_revoke) {
                    objectURL && URL.revokeObjectURL(objectURL)
                }
                resolve(img)
            }
            img.onerror = () => {
                reject(new Error('That image was not found.:' + url.length))
            }
            img.src = url
        })
    },

    /**
     * 批量加载图片，返回结果数组
     * 依赖loadImage
     * @param {Array}     urls     一组图片的url
     * @return {Array}    包含img对象的数组
     */
    batchLoadImage(urls) {
        return Promise.all(urls.map(url => this.loadImage(url)))
    },

    /**
     * 生成一个区间内的随机整数
     * @param   {Number} min 最小值（包含）
     * @param   {Number} max 最大值（包含）
     */
    rdm(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    },

    // 按顺序执行promise
    // tasks为数组，每项为一个返回promise的函数
    sequenceTasks(tasks) {
        function recordValue(results, value) {
            results.push(value);
            return results;
        }
        var pushValue = recordValue.bind(null, []);
        return tasks.reduce(function (promise, task) {
            return promise.then(task).then(pushValue);
        }, Promise.resolve());
    },

    /**
     * 根据参数名称 获取参数值
     * @param {String} name 参数名称
     * @return {String|null} 返回字符串或者null
     */
    getQueryString(name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
        var r = window.location.search.substr(1).match(reg);
        if (r != null) return unescape(r[2]);
        return null;
    },

    /**
     * 异步插入script标签到dom中
     * @param {String}  src   脚本链接
     */
    injectScript(src, _async = true) {
        var s, t;
        s = document.createElement("script");
        s.type = "text/javascript";
        s.src = src;
        s.async = _async
        t = document.getElementsByTagName("script")[0];
        t.parentNode.insertBefore(s, t);
    },

    log() {
        __DEV__ && console.log(...arguments)
    },

    // 压缩京东cdn图片
    compressCDN(img_url) {
        return img_url.replace('/jfs/', '/s100x100_jfs/')
    },

    /**
     * 对象转参数
     * @param {Object} obj 
     */
    obj2str(obj) {
        return Object.keys(obj).map(key => `${key}=${obj[key]}`).join('&')
    },

    // 延迟几秒
    sleep(time) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve('sleep end')
            }, time * 1000);
        })
    },

    // 将链接替换为https的 一般用于替换图片地址
    http2https(full_url) {
        if (full_url.match(/^http:\/\//)) {
            return full_url.replace('http://', 'https://')
        }
        return full_url
    },

    // 获取字符串长度，一个中文汉字的长度为2
    getRealLen(str) {
        return str.replace(/[^\x00-\xff]/g, '__').length; //这个把所有双字节的都给匹配进去了
    },

    // 转化字节
    bytesToSize(bytes) {
        if (bytes === 0) return '0 B';
        var k = 1024, // or 1024
            sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
            i = Math.floor(Math.log(bytes) / Math.log(k));
       return parseInt((bytes / Math.pow(k, i)).toPrecision(3)) + sizes[i];
    },

    deepCopy(obj) {
        var newobj = obj.constructor === Array ? [] : {};
        if (typeof obj !== 'object') {
            return;
        }
        for (var i in obj) {
            newobj[i] = typeof obj[i] === 'object' ?
                this.deepCopy(obj[i]) : obj[i];
        }
        return newobj
    },

    /**
     * 以下为处理文件对象的方法
     * -----------------
     * Reference:
     * 一篇很全的文章：https://www.ctolib.com/topics-120093.html
     * 看起来还不错的库：https://github.com/CommanderXL/imgResize
     * 移动端图片上传旋转、压缩的解决方案: https://github.com/lin-xin/blog/issues/18
     */

    /**
     * file 转成 dataURL
     * @param file 文件
     * @param callback 回调函数
     */
    file2dataURL(file) {
        return new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onload = function (e) {
                resolve(e.target.result)
            };
            reader.onerror = reject
            reader.readAsDataURL(file);
        })
    },

    /**
     * dataURL 转成 blob
     * via: https://qiutc.me/post/uploading-image-file-in-mobile-fe.html
     * @param dataURL
     * @return blob
     */
    dataURL2blob(dataURL) {
        let binaryString = atob(dataURL.split(',')[1]);
        let arrayBuffer = new ArrayBuffer(binaryString.length);
        let intArray = new Uint8Array(arrayBuffer);
        let mime = dataURL.split(',')[0].match(/:(.*?);/)[1]
        for (let i = 0, j = binaryString.length; i < j; i++) {
            intArray[i] = binaryString.charCodeAt(i);
        }
        let data = [intArray];
        let result;
        try {
            result = new Blob(data, { type: mime });
        } catch (error) {
            window.BlobBuilder = window.BlobBuilder ||
                window.WebKitBlobBuilder ||
                window.MozBlobBuilder ||
                window.MSBlobBuilder;
            if (error.name === 'TypeError' && window.BlobBuilder) {
                var builder = new BlobBuilder();
                builder.append(arrayBuffer);
                result = builder.getBlob(type);
            } else {
                throw new Error('没救了');
            }
        }
        return result;
    },

    /**
     * 将base64转换为file对象
     * @param {String} dataURL    base64数据
     * @param {String} filename   文件名
     * ----------------------------
     * 注意：低版本ios，v9.3(含)以下不兼容 File constructor
     * https://github.com/Esri/offline-editor-js/issues/357
     * https://caniuse.com/#search=File
     */
    dataURL2file(dataURL, filename = 'custom_file') {
        try {
            var arr = dataURL.split(','),
                mime = arr[0].match(/:(.*?);/)[1],
                bstr = atob(arr[1]),
                n = bstr.length,
                u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            filename += '.' + mime.split('/')[1]
            return new File([u8arr], filename, {
                type: mime
            });
        } catch (error) {
            console.warn('Browser does not support the File constructor,Will use blob instead of file')
            return this.dataURL2blob(dataURL)
        }
    },

    /**
     * 创建新的URL 对象表示指定的 File 对象或 Blob 对象。
     * @param {String} dataURL  base64
     * ---------------------------------
     * 注意：ios低版本，v11.0以下当我们创建Image对象，在onload一个base64的图片时，出直接跳到onerror中
     * 具体原因：Browsers can have some limitation on data URI size
     * https://stackoverflow.com/questions/21728604/ie10-base64-encoded-image-load-error
     * Tips: 为了性能，建议使用完后移除这个对象。window.URL.revokeObjectURL(objectURL);
     * https://juejin.im/entry/5937c98eac502e0068cf31ae
     */
    dataURL2ObjUrl(dataURL) {
        if (window.URL && URL.createObjectURL) {
            var blob = this.dataURL2blob(dataURL)
            return URL.createObjectURL(blob)
        }
        return dataURL
    },

    /**
     * 压缩base64
     * @param {String}   dataURL        base64数据
     * @param {Number}   quality        压缩率，默认0.9
     * @param {Boolean}  resize_width   重设图片宽高，默认不重设，为数字且原图大于重设值时进行重设
     */
    compressDataURL(dataURL, quality = 0.9, resize_width = false) {
        return new Promise((resolve, reject) => {
            var img = new Image();
            img.crossOrigin = 'Anonymous'
            img.onload = function () {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');

                var ratio = img.width / img.height

                // 如果开启重设宽度 并且 图片宽度大于重设值
                if (resize_width && img.width > resize_width) {
                    canvas.width = resize_width
                    canvas.height = resize_width / ratio
                } else {
                    canvas.width = img.width
                    canvas.height = img.height
                }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // 在指定图片格式为 image/jpeg 或 image/webp的情况下，
                // 可以从 0 到 1 的区间内选择图片的质量。如果超出取值范围，将会使用默认值 0.92。其他参数会被忽略。
                var compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedDataUrl)
            }
            img.onerror = reject
            img.src = dataURL
        })
    },

    utf82dataURL(str) {dataURL
        return window.btoa(encodeURIComponent(escape(str)));
    },

    dataURL2Utf8(str) {
        return unescape(decodeURIComponent(window.atob(str)));
    },

    createBoundary() {
        let multipartChars = "-_1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let length = 30 + Math.floor(Math.random() * 10);
        let boundary = "---------------------------";
        for (let i = 0; i < length; i++) {
            boundary += multipartChars.charAt(Math.floor(Math.random() * multipartChars.length));
        }
        return boundary;
    },


}



/**
 * 知识点

一、使用jQuery Ajax上传时的参数配置与普通请求的区别

let fd = new FormData()
fd.append("file", file)
fd.append("appKey", 'vinci321'); // 其他参数

$.ajax({
    url: 'http://example.com/api',
    method: 'post',
    data: fd,
    cache: false,
    processData: false,
    dataType: "json",
    contentType: false,
    // timeout: 15000,
    xhrFields: { // for cors
        withCredentials: true
    },
    success: function() {}
});

二、下载文件

Blod 对象可以通过 window.URL 对象生成一个网络地址，结合 a 标签的 download 属性来实现下载文件功能。

比如把 canvas 下载为一个图片文件。

var canvas = document.getElementById('canvas');
canvas.toBlob(function(blob){
    // 使用 createObjectURL 生成地址，格式为 blob:null/fd95b806-db11-4f98-b2ce-5eb16b38ba36
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.download = 'canvas';
    a.href = url;
    // 模拟a标签点击进行下载
    a.click();
    // 下载后告诉浏览器不再需要保持这个文件的引用了
    URL.revokeObjectURL(url);
});

三、前端对图片进行本地压缩预览并上传实践
https://my.oschina.net/codingDog/blog/1534940

HTMLCanvasElement.toBlob()
https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLCanvasElement/toBlob

四、Empty files uploaded in Android Native browser
解决方案见：https://qiutc.me/post/uploading-image-file-in-mobile-fe.html

 ***/