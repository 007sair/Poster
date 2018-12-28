/**
 * 根据mask抠出图片
 * @param {ImageObject} oImg    原始图片
 * @param {ImageObject} oMask   接口返回的mask图片
 * @return {String} 返回base64的数据流 
 */

export default async function (oImg, oMask) {
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