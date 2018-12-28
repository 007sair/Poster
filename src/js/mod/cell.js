/**
 * 元件模块
 * --------
 * 每一个出现在舞台上的元素都被称为元件，如：人像，贴纸，前景图，边框，文字等
 */

import _ from '@/js/lib/tool'

class Cell {

    constructor(config = {}) {

        // 默认通用配置项
        this.config = Object.assign({

            cls: '', // 元件样式
            type: 2, // 元件类型 1-背景 2-人像  3-贴图  4-前景  5-贴纸文字
            unique: false, // 是否唯一，为`true`时会移除旧的同类型元件
            z_index: undefined, // 上下层级，有z_index时使用z_index，无则使用type值
            selected: true, // 创建时是否被选中，默认选中

            /**
             * 是否显示某个按钮
             */
            show_edit: false, // 编辑按钮，默认不显示
            show_flip: true, // 镜像按钮，默认显示
            show_del: true, // 删除按钮，默认显示
            show_copy: false, // 复制按钮，默认不显示
            
            /**
             * 启动/禁用 某项功能
             * 如果同时禁用pinch与rotate，则不会显示右下角按钮
             */
            enable_pan: true, // 是否启动拖拽，默认可拖拽
            enable_pinch: true, // 是否启动缩放，默认启动
            enable_rotate: true, // 是否启动旋转，默认启动
            enable_selected: true, // 是否启动点击被选中，默认启动

            /* 定位属性，具体可以参考`_getPos`函数 */
            mode: 'default', // 定位模式，字符串类型，值有：`default`、`random`，默认`default`
            direction: 1, // 定位方向，数字类型，顺时针方向依次为：1-左上、2-右上、3-右下下、4-左下下。默认1
            position: [0, 0], // 定位坐标，值分别为`sx`,`sy`，当值为字符串`center`时表示居中

            /* 图像 元件独有 */
            img: null, // 图像对象
            width: '', // 期望图像宽度

            /* 贴纸文字 元件独有 */
            padding: 10, // 文字内边距
            line_height: 1.2, // 行高，涉及多行绘制文字问题，建议不要更改
            font_size: 24, // 字号大小
            color: '#fff', // 文字颜色，默认白色
            text: '' // 文本内容

        }, config)

        // 配置中有z_index时优先使用，否则使用type的值决定层级
        this.zIndex = this.config.z_index !== undefined ? this.config.z_index : this.config.type

        // 元件id，确保元件唯一
        this.id = ['cell', _.uuid()].join('-') // 元素id，绑定hanmmer使用

        // 元件变换数据对象
        this.translate = {
            flip_x: false, // 是否水平翻转
            start_sx: 0,
            start_sy: 0,
            start_scale: 1,
            start_rotation: 0,
            sx: 0, // x轴偏移量
            sy: 0, // y轴偏移量
            scale: 1, // 缩放系数
            rotation: 0, // 旋转值，可直接用于transform
            last_sx: 0,
            last_sy: 0,
            last_scale: 1,
            last_rotation: 0
        }

        // 最小缩放值
        this.minScale = 20 / Math.min(640, document.documentElement.clientWidth)

        this.eventTarget = null // 解决事件冲突

        this.origin_scale = 1 // 原始缩放值，设置不变的那些按钮

        // 事件临时变量
        this.mtouch = {
            singleBasePoint: 0,
            singlePinchLength: 0,
            singlePinchStartLength: 0,
            pinchV1: 0,
            pinchV2: 0,
            rotateV1: 0,
            rotateV2: 0,
            lastDiff: 0,
            diffThreshold: 0
        }
    }

    /**
     * 将元件缩放、位移到指定位置
     * @param {Object} obj 缩放、位移对象
     */
    resize(obj) {
        let config = Object.assign({}, this.config, obj)

        let { translate } = this

        if (config.img) {
            let { img, width, sx, sy } = config

            translate.scale = width / img.width
            translate.sx = -(img.width * (1 - translate.scale)) / 2 + sx
            translate.sy = -(img.height * (1 - translate.scale)) / 2 + sy

            translate.last_scale = translate.scale
        }

        if (config.text) {
            translate.sx = config.sx
            translate.sy = config.sy
        }

        translate.last_sx = translate.sx
        translate.last_sy = translate.sy
    }

    /**
     * 设置元件样式
     */
    setStyle() {
        let styles = {
            transform: `
                translate(${this.translate.sx}px, ${this.translate.sy}px)
                scale(${this.translate.scale})
                rotate(${this.translate.rotation}deg)
            `,
            zIndex: this.zIndex
        }

        // 前景类型
        if (this.config.type === 4) {
            styles['pointer-events'] = 'none'
        }

        return styles
    }

    /**
     * 镜像 水平反转
     */
    flip() {
        this.translate.flip_x = !this.translate.flip_x
    }

    /**
     * 冻结缩放比例，始终为1
     */
    freeze() {
        return {
            transform: `scale(${1 / this.translate.scale})`
        }
    }

    /**
     * 获取元件左上角距离舞台左上角的绝对距离
     */
    getStageOffset() {
        if (!this.config.img) {
            throw new Error('无法获取元件的原始大小')
        }
        let origin_x = -(this.config.img.width * (1 - this.translate.scale)) / 2,
            origin_y = -(this.config.img.height * (1 - this.translate.scale)) / 2
        return {
            x: Math.round(0 - (origin_x - this.translate.sx)),
            y: Math.round(0 - (origin_y - this.translate.sy))
        }
    }

    /**
     * 根据config，获取当前元件在舞台中的尺寸大小
     */
    getSize() {
        let w = 0,
            h = 0

        // 图片元件，直接获取宽度，高度通过计算得出
        if (this.config.img) {
            let { img, width } = this.config
            let img_ratio = img.width / img.height
            w = width
            h = width / img_ratio
        }

        // 文本元件，计算文字行数与长度即可
        if (this.config.text) {
            // 解构元件属性中的属性
            let { text, font_size, line_height, padding } = this.config
            let arr_text = text.split('\n')
            let line = arr_text.length
            let longText = arr_text.sort((m, n) => n.length - m.length)[0].trim()
            let longTextWidth = this.getStrWidth(longText, font_size)

            w = longTextWidth + (padding * 2)
            h = line * (font_size * line_height) + (padding * 2)
        }

        if (!w) throw new Error('获取不到元件宽高')
        if (!h) throw new Error('获取不到元件高高')

        return {
            width: w,
            height: h
        }
    }

    /**
     * 通过`mode`、`direction`，增强`position`的使用方式
     * @param {Object} stage 舞台实例
     */
    getPos(stage) {
        let sx = 0, sy = 0
        // 元件在舞台的宽高对象
        let size = this.getSize()
        // 配置
        let opts = Object.assign({}, {
            width: 0, // 元件宽度，通过size获取
            height: 0, // 元件高度，通过size获取
            mode: 'default', // 定位模式
            position: [0, 0], // 定位横纵坐标
            direction: 1 // 定位方向
        }, this.config, size)

        /**
         * 关于`mode`、`direction`，目的为强化`position`的使用方式。
         * 单一的横纵坐标的定位方式，不能满足多种业务需求。
         * 如果遇到特殊定位要求，我们就需要计算来得到最终的横纵坐标。
         * 所以，通过添加`mode`、`direction`的方式，使定位更加灵活。
         * `mode`，字符串类型，值如下：
         *   - `default`，默认类型。
         *   - `random`，随机类型，随机横纵坐标。
         * `direction`，整型，值有：1-左上（默认值）、2-右上、3-右下、4-左下，顺时针4个方向。
         * `position`，数组类型，值可以是数字或'center'。`mode`和`direction`不同时，它的表现形式也不同。
         *   - 当`mode='random'`时，`position`不再表示舞台左上角的起始横纵值，而是缩小的随机范围。例如：
         *     比如：`position = [30, 50]`，元件在左右的随机距离缩小了`舞台宽 - 60`，上下缩小了`舞台高 - 100`的大小
         *   - 当`direction`起作用时，表示当前方向的偏移量。
         *     比如：在右上角距离顶部20px位置展示一个logo图片，代码如下：
         *       direction = 2 // 右上角
         *       position = [0, 20] // 0-紧贴右侧 20-从顶部偏移20px
         */
        let { mode, position, width, height, direction } = opts

        if (typeof mode !== 'string') throw new TypeError('model必须为字符串类型')
        if (!Array.isArray(position)) throw new TypeError('position不是数组')

        position.forEach(p => {
            if (typeof p !== 'number') {
                if (typeof p !== 'string') {
                    throw new TypeError('position内类型错误：只支持数字和字符串')
                } else {
                    if (p !== 'center') {
                        throw new TypeError('position内类型错误：字符串仅支持center')
                    }
                }
            }
        })

        let px = position[0],
            py = position[1]

        if (mode === 'default') {
            if (typeof px === 'string' && px === 'center') {
                sx = px ? (stage.width - width) / 2 : 0
            } else {
                if (direction == 1 || direction == 4) {
                    sx = px
                } else {
                    sx = stage.width - width - px
                }
            }
            
            if (typeof py === 'string' && py === 'center') {
                sy = py ? (stage.height - height) / 2 : 0
            } else {
                if (direction == 1 || direction == 2) {
                    sy = py
                } else {
                    sy = stage.height - height - py
                }
            }
        }

        if (mode === 'random') {
            let max_px = stage.width - width - px,
                max_py = stage.height - height - py

            if (max_px < 0) {
                throw new Error(`随机内边距过大，请在0至${Math.floor(stage.width - width)}内设置数值`)
            }
            if (max_py < 0) {
                throw new Error(`随机内边距过大，请在0至${Math.floor(stage.height - height)}内设置数值`)
            }

            sx = _.rdm(px, max_px)
            sy = _.rdm(py, max_py)
        }
        
        return {
            sx, sy
        }
    }

    /**
     * 获取单行文本的长度
     * @param {String} str 文本，包含中、英文
     * @param {Number} font_size 字号
     */
    getStrWidth(str, font_size) {
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')

        ctx.textBaseline = 'middle'

        ctx.font = `${font_size}px "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Hiragino Sans GB", "Heiti SC", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif` //设置字体

        // measureText：必须在设置样式后调用
        return ctx.measureText(str).width
    }


    /**
     * 双指事件：拖动、旋转、缩放元件
     * @param {Object} e 事件对象
     */
    onMultiple(e) {
        let { mtouch, translate } = this

        if (!this.config.enable_pan) {
            return false
        }

        // 如果触发了 mc_mouse 的事件，就不触发mc
        if (this.eventTarget) return

        e.preventDefault();

        switch (e.type) {
            case 'rotatestart':
                translate.last_scale = translate.scale;
                translate.last_rotation = translate.rotation;
                translate.start_rotation = e.rotation;
                break;
            case 'rotateend':
                translate.last_scale = translate.scale;
                translate.last_rotation = translate.rotation;
                break;
            case 'rotate':
                let diff = translate.start_rotation - e.rotation;
                mtouch.diffThreshold = Math.abs(mtouch.lastDiff - diff)
                if (mtouch.diffThreshold < 10) { // diff阀值小于10才做旋转赋值
                    translate.rotation = translate.last_rotation - diff;
                }
                mtouch.lastDiff = diff
                break;
            case 'pinch':
                translate.scale = Math.max(this.minScale, Math.min(translate.last_scale * e.scale, 10));
                break;
            case 'pinchstart':
                translate.last_scale = translate.scale;
                break;
            case 'pinchend':
                translate.last_scale = translate.scale;
                break;
            case 'pan':
                translate.sx = e.deltaX + translate.last_sx
                translate.sy = e.deltaY + translate.last_sy
                break;
            case 'panend':
                translate.last_sx = translate.sx;
                translate.last_sy = translate.sy;

                break;
        }
    }

    /**
     * 单指操作：元件右下角按钮事件
     * @param {Object} e 事件对象
     */
    onSingle(e) {
        e.preventDefault()

        let { mtouch, translate } = this

        this.eventTarget = e.target

        switch (e.type) {
            case 'panstart':
                // 获取元件的中心点坐标
                mtouch.singleBasePoint = this.getBasePoint(document.getElementById(this.id))
                // 获取初始向量
                mtouch.pinchV1 = this.getVector(e.center, mtouch.singleBasePoint);
                mtouch.singlePinchStartLength = this.getLength(mtouch.pinchV1);
                if (this.config.enable_pinch) {
                    translate.last_scale = translate.scale
                }
                if (this.config.enable_rotate) {
                    mtouch.rotateV1 = this.getVector(e.center, mtouch.singleBasePoint);
                    translate.last_rotation = translate.rotation
                }
                break;
            case 'pan':
                if (this.config.enable_rotate) {
                    mtouch.rotateV2 = this.getVector(e.center, mtouch.singleBasePoint);
                    translate.rotation = translate.last_rotation + this.getAngle(mtouch.rotateV1, mtouch.rotateV2)
                }
                if (this.config.enable_pinch) {
                    if (e.deltaX != 0) { // 避免为0时元素会闪跳一下
                        mtouch.pinchV2 = this.getVector(e.center, mtouch.singleBasePoint)
                        mtouch.singlePinchLength = this.getLength(mtouch.pinchV2)
                        let scale = translate.last_scale * mtouch.singlePinchLength / mtouch.singlePinchStartLength
                        translate.scale = Math.max(this.minScale, scale)
                    }
                }
                break;
            case 'panend':
                translate.last_rotation = translate.rotation
                translate.last_scale = translate.scale
                setTimeout(() => {
                    this.eventTarget = null
                }, 0);
                break;
        }

    }

    /**
     * 以下函数参考自：https://github.com/xd-tayde/mtouch/blob/master/src/utils.js
     * 原理来自：https://segmentfault.com/a/1190000010511484
     */
    getLength(v1) {
        if (typeof v1 !== 'object') {
            console.error('getLength error!')
            return
        }
        return Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    }

    getAngle(v1, v2) {
        if (typeof v1 !== 'object' || typeof v2 !== 'object') {
            console.error('getAngle error!')
            return
        }
        // 判断方向，顺时针为 1 ,逆时针为 -1；
        let direction = v1.x * v2.y - v2.x * v1.y > 0 ? 1 : -1,
            // 两个向量的模；
            len1 = this.getLength(v1),
            len2 = this.getLength(v2),
            mr = len1 * len2,
            dot, r;
        if (mr === 0) return 0;
        // 通过数量积公式可以推导出：
        // cos = (x1 * x2 + y1 * y2)/(|a| * |b|);
        dot = v1.x * v2.x + v1.y * v2.y;
        r = dot / mr;
        if (r > 1) r = 1;
        if (r < -1) r = -1;
        // 解值并结合方向转化为角度值；
        return Math.acos(r) * direction * 180 / Math.PI;
    }

    getBasePoint(el) {
        if (!el) {
            return {
                x: 0,
                y: 0
            }
        }
        let offset = this.getOffset(el);
        let x = offset.left + el.getBoundingClientRect().width / 2,
            y = offset.top + el.getBoundingClientRect().width / 2;
        return {
            x: Math.round(x),
            y: Math.round(y)
        }
    }

    getVector(p1, p2) {
        if (typeof p1 !== 'object' || typeof p2 !== 'object') {
            console.error('getvector error!')
            return
        }
        let x = Math.round(p1.x - p2.x),
            y = Math.round(p1.y - p2.y);
        return {
            x,
            y
        }
    }

    getPoint(ev, index) {
        if (!ev || !ev.touches[index]) {
            console.error('getPoint error!')
            return
        }
        return {
            x: Math.round(ev.touches[index].pageX),
            y: Math.round(ev.touches[index].pageY),
        }
    }

    getOffset(el) {
        el = typeof el == 'string' ? document.querySelector(el) : el
        let rect = el.getBoundingClientRect()
        let offset = {
            left: rect.left + document.body.scrollLeft,
            top: rect.top + document.body.scrollTop,
            width: el.offsetWidth,
            height: el.offsetHeight,
        }
        return offset
    }

    matrixTo(matrix) {
        let arr = (matrix.replace('matrix(', '').replace(')', '')).split(',')
        let cos = arr[0],
            sin = arr[1],
            tan = sin / cos,
            rotate = Math.atan(tan) * 180 / Math.PI,
            scale = cos / (Math.cos(Math.PI / 180 * rotate)),
            trans;
        trans = {
            x: parseInt(arr[4]),
            y: parseInt(arr[5]),
            scale,
            rotate,
        }
        return trans
    }
    
}

export default Cell