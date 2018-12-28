/**
 * 生成base64的二维码图片
 * 二维码信息为此页面的url
 */

import QRCode from '@/js/lib/qrcode'

export default function () {
    return new Promise((resolve, reject) => {
        // 二维码相对画布的大小
        let size = 460

        // 创建二维码
        let oDiv = document.createElement('div')
        oDiv.id = '__qrcode__'
        oDiv.style.display = 'none'
        document.body.appendChild(oDiv)

        let qrcode = new QRCode(document.getElementById(oDiv.id), {
            text: window.location.href,
            width: size,
            height: size,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        let timer = null
        timer = setInterval(() => {
            let src = qrcode._oDrawing._elImage.currentSrc
            if (src) {
                clearInterval(timer)
                resolve(src)
            }
        }, 50)
    })
}