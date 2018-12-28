/**
 * 传入file对象，返回抠好的图
 --------------------------
 使用方法：
 ``` js
    import file2cut from 'file2cut.js'
    file2cut(file).then(cut => {
        // cut in IOS: 'data:image/png;base64...'
        // cur in Android: 'https://m.360buyimg.com/xxx/xxx.png'
        console.log(cut)
    })
 ```
 */
import _ from '@/js/lib/tool'
import Api from '@/js/mod/api'
import '@/js/lib/canvas_resize'

/**
 * 是否是安卓
 */
function isAndroid() {
    let u = navigator.userAgent
    return u.indexOf('Android') > -1 || u.indexOf('Adr') > -1
}

/**
 * 根据mask抠出图片
 * @param {ImageObject} oImg    原始图片
 * @param {ImageObject} oMask   接口返回的mask图片
 * @return {String} 返回base64的数据流 
 */
async function mask2cut(oImg, oMask) {
    try {

        if (
            typeof oImg !== 'object' || oImg.tagName !== 'IMG'
            ||
            typeof oMask !== 'object' || oMask.tagName !== 'IMG'
        ) {
            throw new Error('参数必须为image对象')
        }

        function getImageData(img) {
            let canvas = document.createElement('canvas')
            let ctx = canvas.getContext('2d')
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)
            return ctx.getImageData(0, 0, img.width, img.height)
        }

        let imgData = getImageData(oImg),
            maskData = getImageData(oMask);

        function filter(_imgData, _maskData) {
            for (let i = 0, len = _maskData.length; i < len; i += 4) {
                let r = _maskData[i],
                    g = _maskData[i + 1],
                    b = _maskData[i + 2];

                // 色值在250-256之间都认为是白色
                if ([r, g, b].every(v => v == 0)) {
                    _imgData[i + 3] = 0; // 把白色改成透明的  
                }
            }
        }

        filter(imgData.data, maskData.data)

        let cut_canvas = document.createElement('canvas')
        let cut_ctx = cut_canvas.getContext('2d')
        cut_canvas.width = oImg.width
        cut_canvas.height = oImg.height
        cut_ctx.putImageData(imgData, 0, 0)

        return cut_canvas.toDataURL('image/png', 0.9)

    } catch (error) {
        throw error
    }
}

/**
 * [异步]，压缩、修正图片角度，转换图片，返回base64
 * @param {FileObject} file 文件对象
 */
function compress(file) {
    return new Promise((resolve, reject) => {
        if (__DEV__) {
            console.log('压缩前:', _.bytesToSize(file.size))
        }
        const QUALITY = 0.92 // 压缩率
        canvasResize(file, {
            resize: 1080, // 图片宽度压缩值
            crop: false, // 是否裁剪
            quality: QUALITY, // 压缩质量  0 - 1
            rotate: 0, // 旋转角度 
            callback(base64) {
                if (__DEV__) {
                    const __file = _.dataURL2blob(base64)
                    console.log('压缩后:', _.bytesToSize(__file.size), '图片质量:', QUALITY)
                }
                resolve(base64)
            }
        })
    })
}

export default async function (file) {
    try {
        let cut_src = ''
        let base64 = await compress(file)
        let blob = _.dataURL2blob(base64)

        // 临时解决方案：
        // 安卓：端使用接口返回的抠图
        // ios：使用接口返回的mask图，在前端进行抠图
        if (isAndroid()) {
            // 参数0：表示返回抠好的图，不返回mask图
            let cut_data = await Api.getCutPic(blob, 0)
            cut_src = cut_data.imgUrl
        } else {
            let cut_data = await Api.getCutPic(blob)
            let [oldImg, maskImg] = await _.batchLoadImage([base64, cut_data.imgUrl])
            // 根据接口返回的mask，抠出一张png的base64图片
            cut_src = await mask2cut(oldImg, maskImg)
        }

        await _.loadImage(cut_src)

        return cut_src
        
    } catch (error) {
        throw error
    }
}