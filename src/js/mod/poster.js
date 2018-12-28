/**
 * 海报生成类
 */

import _ from '@/js/lib/tool'

class Poster {

    constructor(scale) {
        // 海报画布，通过create方法创建
        this.canvas = null
        // 比例，海报宽度 / 舞台宽度
        this.scale = scale || 1
    }

    /**
     * 创建指定大小的画布
     * @param {Number} canvas_width 海报宽度
     * @param {Number} canvas_wheight 海报高度
     * @return 返回自身，可以链式调用
     */
    create(canvas_width, canvas_height) {
        this.canvas = document.createElement('canvas')

        this.canvas.width = canvas_width
        this.canvas.height = canvas_height

        return this
    }

    /**
     * 使用颜色填充区域
     * @param {String} color 16进制色值
     * @param {Number} sx 起始横坐标
     * @param {Number} sy 起始纵坐标
     * @param {Number} width 填充宽度
     * @param {Number} height 填充高度
     */
    rect(color = '#fff', sx = 0, sy = 0, width, height) {
        width = width || this.canvas.width
        height = height || this.canvas.height
        let ctx = this.canvas.getContext('2d')

        ctx.fillStyle = color
        ctx.fillRect(sx, sy, width, height)

        return this
    }

    /**
     * 在画布底层渲染背景色
     * @param {String} bg_color 16进制色值
     */
    bg(bg_color = '#fff') {
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')

        canvas.width = this.canvas.width
        canvas.height = this.canvas.height

        ctx.fillStyle = bg_color
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.drawImage(this.canvas, 0, 0)

        this.canvas = canvas

        return this
    }

    /**
     * 绘制图像到canvas中
     * @param {ImageObject} img img对象
     * @param {Number} sx 起始横坐标
     * @param {Number} sy 起始纵坐标
     * @param {Number} width 绘制宽度
     * @param {Number} height 绘制高度
     * @param {Number} direction 绘制方向，1-左上、2-右上、3-左下、4-右下
     */
    drawImage(img, sx = 0, sy = 0, width, height, direction = 1) {
        if (!width || !height) {
            throw new Error('drawImage没有传入正确的宽高')
        }
        let ctx = this.canvas.getContext('2d')
        let pos = this.getPos(sx, sy, this.canvas.width, this.canvas.height, width, height, direction)
        ctx.drawImage(img, pos.sx, pos.sy, width, height)

        return this
    }

    /**
     * 
     * @param {String} text 文本内容
     * @param {Number} sx 起始横坐标
     * @param {Number} sy 起始纵坐标
     * @param {Object} config 其他配置信息
     */
    drawText(text, sx, sy, config) {

        let obj = Object.assign({}, {
            font_size: 24, // 字号
            line_height: 1.5, // 行高
            color: '#000', // 字色
            direction: 1, // 定位方向，与sx，sy结合使用，值有：1-左上 2-右上 3-有
            bold: '', // 加粗
            bg_color: '' // 背景色
        }, config)

        let { font_size, line_height, color, direction, bold, bg_color } = obj

        let ctx = this.canvas.getContext('2d')
        // 等比获取字号大小
        font_size *= this.scale
        // 通过字号获取行高
        let lineHeight = font_size * line_height
        // 按照换行符，切割原始文本
        let result = text.split('\n')
        // 找到所有文本中最长的那条数据
        let longestLine = result.slice(0).sort((m, n) => n.length - m.length)[0]
        // 设置对齐方式
        ctx.textBaseline = 'middle'
        // 设置字体
        ctx.font = `${bold} ${font_size}px "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Heiti SC", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif` 

        // measureText：必须在设置样式后调用
        let width = ctx.measureText(longestLine).width
        let height = result.length * lineHeight

        let pos = this.getPos(sx, sy, this.canvas.width, this.canvas.height, width, height, direction)

        result.forEach(function (line, index) {
            // 在文字底部画底色
            if (bg_color) {
                let lineWidth = ctx.measureText(line).width
                ctx.fillStyle = '#f00'
                ctx.fillRect(pos.sx, pos.sy + lineHeight * index, lineWidth, lineHeight)
            }
            
            ctx.fillStyle = color
            ctx.fillText(line, pos.sx, pos.sy + (lineHeight / 2) + lineHeight * index)
        })

        return this
    }

    getPos(sx, sy, parent_width, parent_height, self_width, self_height, direction) {
        if (typeof sx === 'string' && sx === 'center') {
            sx = sx ? (parent_width - self_width) / 2 : 0
        } else {
            if (direction == 1 || direction == 4) {
                sx = sx
            } else {
                sx = parent_width - self_width - sx
            }
        }
        
        if (typeof sy === 'string' && sy === 'center') {
            sy = sy ? (parent_height - self_height) / 2 : 0
        } else {
            if (direction == 1 || direction == 2) {
                sy = sy
            } else {
                sy = parent_height - self_height - sy
            }
        }
        return {
            sx, sy
        }
    }


    /**
     * 拼接画布
     * @param {Array} arr_canvas 需要拼接的画布
     * @return 返回自身，可以链式调用
     */
    join(arr_canvas/* [canvas, ...] */) {
        if (!Array.isArray(arr_canvas)) {
            throw new TypeError('参数类型必须为数组')
        }

        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')

        let total_height = 0
        let datas = []

        arr_canvas.forEach(cvs => {
            let data = {
                source: cvs,
                sx: 0,
                sy: total_height,
                width: cvs.width,
                height: cvs.height
            }
            total_height += cvs.height
            datas.push(data)
        })

        canvas.width = this.canvas.width
        canvas.height = total_height

        datas.forEach(data => {
            ctx.drawImage(data.source, data.sx, data.sy, data.width, data.height)
        })

        this.canvas = canvas

        return this
    }

    /**
     * 在当前画布前添加arr_canvas
     * @param {Array} arr_canvas 需要拼接的画布数组
     * @return 返回自身，可以链式调用
     */
    prepend(arr_canvas/* [canvas, ...] */) {
        arr_canvas.push(this.canvas)
        return this.join(arr_canvas)
    }

    /**
     * 在当前画布后添加arr_canvas
     * @param {Array} arr_canvas 需要拼接的画布数组
     * @return 返回自身，可以链式调用
     */
    append(arr_canvas/* [canvas, ...] */) {
        arr_canvas.unshift(this.canvas)
        return this.join(arr_canvas)
    }

    /**
     * 设置边框
     * @param {Array} border 边框数组，数组长度最少为1，最多为4。个数规则同css中的margin、padding等，如：
     * - [150]，表示4个边都为150宽
     * - [150, 100]，表示上下为150，左右为100
     * - [150, 100, 200]，表示上为150，左右为100，下为200
     * - [150, 100, 200, 50]，表示上为150，右100，下200，左50
     * @param {String} color 边框（背景）颜色，默认白色
     * @return 返回自身，可以链式调用
     */
    border(border, color = '#fff') {
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')
        let border_top, border_right, border_bottom, border_left
        if (Array.isArray(border)) {
            if (border.length < 1 || border.length > 4) {
                throw new Error('数组长度有误，最少为1，最多为4.')
            }
            switch (border.length) {
                case 1:
                    border_top = border_right = border_bottom = border_left = set(border[0])
                    break;
                case 2:
                    border_top = border_bottom = set(border[0])
                    border_right = border_left = set(border[1])
                    break;
                case 3:
                    border_top = set(border[0])
                    border_right = border_left = set(border[1])
                    border_bottom = set(border[2])
                    break;
                case 4:
                    border_top = set(border[0])
                    border_right = set(border[1])
                    border_bottom = set(border[2])
                    border_left = set(border[3])
                    break;
                default:
                    break;
            }
        } else {
            throw new TypeError('参数必须为数组')
        }

        function set(border) {
            let _border = +border
            if (isNaN(_border)) {
                throw new TypeError('请输入有效数字')
            } else {
                return _border
            }
        }

        // 画布是长方形，但是边框四周都是固定值
        // 所以需要根据比例重新获取画布高度
        let ratio = this.canvas.width / this.canvas.height
        let w = this.canvas.width - border_left - border_right
        let h = w / ratio

        canvas.width = w + border_left + border_right
        canvas.height = h + border_top + border_bottom

        ctx.fillStyle = color; // 绘制颜色
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        ctx.drawImage(this.canvas, border_left, border_top, w, h)

        this.canvas = canvas

        return this
    }

    /**
     * 文字自动换行
     * @param {string} str 要绘制的字符串
     * @param {object} canvas canvas对象
     * @param {number} initX 绘制字符串起始x坐标
     * @param {number} initY 绘制字符串起始y坐标
     * @param {number} lineHeight 字行高，自己定义个值即可
     */
    canvasTextAutoLine(str, canvas, initX, initY, lineHeight) {
        var ctx = canvas.getContext("2d");
        var lineWidth = 0;
        var canvasWidth = canvas.width * 0.8;
        var lastSubStrIndex = 0;
        for (let i = 0; i < str.length; i++) {
            lineWidth += ctx.measureText(str[i]).width;
            if (lineWidth > canvasWidth - initX) { //减去initX,防止边界出现的问题
                ctx.fillText(str.substring(lastSubStrIndex, i), initX, initY);
                initY += lineHeight;
                lineWidth = 0;
                lastSubStrIndex = i;
            }
            if (i == str.length - 1) {
                ctx.fillText(str.substring(lastSubStrIndex, i + 1), initX, initY);
            }
        }
    }

}

export default Poster