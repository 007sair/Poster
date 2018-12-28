/**
 * 舞台类
 */

import Cell from '@/js/mod/cell'

class Stage {

    constructor(width = 200, height = 200) {
        // 舞台宽度
        this.width = width
        // 舞台高度
        this.height = height
        // 所有舞台元素
        this.cells = []
    }

    /**
     * 异步向舞台中添加元件
     * @param {Object} config 元件配置，参考`cell.js`中的`默认通用配置项`；
     * 其他属性见注释。
     */
    async add(config) {
        try {
            if (typeof config !== 'object') {
                throw new TypeError(config + '类型错误')
            }
            // 创建元件实例
            let cell = new Cell(config)
            // 获取期望的横纵坐标
            let pos = cell.getPos(this)
            // 重置元件的位置
            cell.resize({
                sx: pos.sx,
                sy: pos.sy
            })
            // 元件是否唯一
            if (config.unique) {
                this.clear(config.type)
            }
            // 移除选中状态
            this.blur()

            this.cells.push(cell)
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    /**
     * 删除元件
     * @param {Number} index 元件索引
     */
    del(index) {
        this.cells.splice(index, 1)
    }

    /**
     * 切换选中、取消状态
     * @param {Object} e 事件对象
     * @param {Object} item 元件对象
     */
    toggle(e, item) {
        // 防止四周按钮误触发点击事件
        if (e.target.className.indexOf('cell') < 0) {
            return false
        }
        this.cells.forEach(cell => {
            if (item.id != cell.id) cell.config.selected = false
        })
        item.config.selected = !item.config.selected
    }

    /**
     * 清除所有元件的选中状态
     */
    blur() {
        this.cells.forEach(cell => cell.config.selected = false)
    }

    /**
     * 复制元件
     * @param {Object} cell 元件对象
     */
    copy(cell) {
        let copy_config = Object.assign({}, cell.config, {
            show_del: true,
        })

        let copy_cell = new Cell(copy_config)

        copy_cell.translate = Object.assign({}, cell.translate, {
            sx: cell.translate.sx + 20,
            sy: cell.translate.sy + 20
        })

        this.blur()
        this.cells.push(copy_cell)
    }

    /**
     * 清除舞台中指定类型的元件
     * @param {Number} type 元件类型
     */
    clear(type) {
        this.cells = this.cells.filter(cell => cell.config.type !== type)
    }

    /**
     * 将舞台转换为画布
     * @param {Number} canvas_width 画布宽度
     */
    toCanvas(canvas_width) {
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')

        /**
         * 设定舞台与创建的画布之间的比例
         * 保证舞台上的元件都能被按照比例画入海报画布中
         */
        this.scale = canvas_width / this.width

        canvas.width = canvas_width
        canvas.height = canvas_width / (this.width / this.height)

        this.cells
            .sort((m, n) => m.zIndex - n.zIndex) // 根据`z-index`排序
            .forEach(cell => { // 绘制所有元件
                if (!cell) return false // 不处理cell为null的元件
                if (cell.config.type == 5) { // 有些元件为文本类型
                    this._drawText(ctx, cell)
                } else {
                    this._drawImage(ctx, cell)
                }
            })

        return canvas
    }

    /**
     * 转换成图片
     * @param {Number} img_width 期望生成的图片宽度
     * @param {String} type 图片格式，默认为 image/jpeg
     * @param {Number} encoderOptions 图片质量
     * @return {String} 包含 data URI 的 DOMString。
     */
    toImage(img_width, type = 'image/jpeg', encoderOptions = 0.92) {
        let canvas = this.toCanvas(img_width)
        // 在指定图片格式为 image/jpeg 或 image/webp的情况下，可以从 0 到 1 的区间内选择图片的质量。
        // 如果超出取值范围，将会使用默认值 0.92。其他参数会被忽略。
        return canvas.toDataURL(type, encoderOptions)
    }

    /**
     * 绘制图像，包含：人像、贴纸、前景
     * @param {CanvasContext} ctx 画布上下文 2d
     * @param {Object} cell 单个元件数据
     */
    _drawImage(ctx, cell) {
        let { translate, config } = cell
        let obj = {
            x: translate.sx + config.img.width / 2,
            y: translate.sy + config.img.height / 2
        }

        let scale = translate.scale * this.scale
        let rotation = translate.rotation
        
        ctx.save()
        ctx.translate(obj.x * this.scale, obj.y * this.scale)
        ctx.rotate(rotation * Math.PI / 180)
        ctx.scale(translate.flip_x ? -scale : scale, scale)
        ctx.translate(-obj.x, -obj.y)
        ctx.drawImage(config.img, translate.sx, translate.sy)
        ctx.restore()
    }

    /**
     * 绘制贴纸文字
     * @param {CanvasContext} ctx 画布上下文 2d
     * @param {Object} cell 单个元件数据
     */
    _drawText(ctx, cell) {
        let { translate, config } = cell
        // 将字号同等缩放到海报比例
        let font_size = config.font_size * this.scale
        // 通过字号获取行高
        let lineHeight = font_size * config.line_height
        // 按照换行符，切割原始文本
        let result = config.text.split('\n')
        // 找到所有文本中最长的那条数据
        let longestLine = result.slice(0).sort((m, n) => n.length - m.length)[0]
        // 先设置文本样式，再获取到的宽度才是正确的
        ctx.textBaseline = 'middle'
        // 设置字体
        ctx.font = `${font_size}px "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Heiti SC", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif` //设置字体
        // 获取最长文本的宽度
        let longestLineWidth = cell.getStrWidth(longestLine, font_size)

        // 计算文本起始位置
        let sx = (translate.sx + config.padding) * this.scale,
            sy = (translate.sy + config.padding) * this.scale,
            translate_x = longestLineWidth / 2 + sx,
            translate_y = (lineHeight * result.length) / 2 + sy;

        ctx.save()
        ctx.translate(translate_x, translate_y)
        ctx.rotate(translate.rotation * Math.PI / 180)
        ctx.scale(translate.scale, translate.scale)
        ctx.translate(-translate_x, -translate_y)
        // 逐行绘制文本
        result.forEach(function (line, index) {
            // 在文字底部画底色
            // let lineWidth = ctx.measureText(line).width
            // ctx.fillStyle = 'black'
            // ctx.fillRect(sx, sy + lineHeight * index, lineWidth, lineHeight)
            ctx.fillStyle = config.color
            ctx.fillText(line, sx, sy + (lineHeight / 2) + lineHeight * index)
        })
        ctx.restore()
    }

}

export default Stage