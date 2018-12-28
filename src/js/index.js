/**
 * TODO:
 * [√] 舞台自适应宽高
 * [√] 添加水平镜像翻转
 * [√] 添加前景层
 * [√] 添加贴纸文字效果
 * [√] 贴纸随机位置
 * [√] 元件复制
 * [√] 海报生成工厂化
 */

/* Requires */
import Vue from 'vue'
import VueTouch from 'vue-touch'
import 'babel-polyfill'
import '@/js/lib/polyfill'
import '@/js/lib/rem750.js'
import '@/js/lib/mu.js'
import _ from '@/js/lib/tool'
import QRCode from '@/js/lib/qrcode'

import Api from '@/js/mod/api'
import WX from '@/js/mod/wx'
import Uploader from '@/js/mod/uploader'
import file2cut from '@/js/mod/file2cut'
import Stage from '@/js/mod/stage'
import Poster from '@/js/mod/poster'

/* Assets */
import 'CSS/main.scss' // 页面样式
import oImgs from 'Mod/assets' // 图片模块对象，key为文件夹 + 图片名称

import PageData from '@/js/mod/data'

Vue.use(VueTouch, {
    name: 'v-touch'
})

// HMR
if (__DEV__) {
    require('@/index.html')
    // let VConsole = require('vconsole')
    // new VConsole()
}

// 初始化微信的相关功能
const _wx_ = new WX()
const USE_DEV_CUT = 1
const SCREEN_WIDTH = Math.min(640, document.documentElement.clientWidth)
const SCREEN_HEIGHT = document.documentElement.clientHeight
const RATIO = 750 / 1107 // 背景图比例

new Vue({
    el: '#app',
    data: {
        stage: {}, // 舞台实例
        oTransform: {}, // 翻页style对象
        assets: [], // 预加载资源
        isLoading: false, // 是否加载状态，加载时禁用一切按钮点击
        tabs: [], // 背景、贴图的选项卡
        stage_width: '', // 舞台宽度
        stage_height: '', // 舞台高度
        is_preload: false, // 是否预加载完毕
        cur_page: 1, // 当前页数
        cover: '', // 封面图
        bgs: [], // 背景图
        stickers: [], // 贴纸
        selected_bg: '', // 选中的背景
        cells: [], // 元件组，每个元件有自己的拖拽、缩放、旋转事件和数据
        poster: '', // 最后生成的海报
        share_info: {}, // 分享数据
        edit_board: { // 贴纸文字的编辑弹层
            status: 'add', // add-新增   edit-编辑
            show: false, // 是否显示弹层
            current_id: '', // 当前被编辑的元件映射id
            selected_bgcolor: false, // 是否选中背景色
            selected_color: '', // 选中颜色
            text: '', // 填写文本
            colors: ['#fff', '#2b2b2b', '#fe1c10', '#fbf606', '#14e213', '#1a9bff', '#8c05ff'] // 备选色值
        }
    },
    components: {
        uploader: Uploader
    },
    methods: {

        // 上一页
		pagePrev(userAnimate = true) {
			this.pageTo(this.cur_page - 1, userAnimate)
		},

		// 下一页
		pageNext(userAnimate = true) {
			this.pageTo(this.cur_page + 1, userAnimate)
		},

		/**
		 * 
		 * @param {Number} index 移动到的页数
		 * @param {Boolean} userAnimate 是否使用动画，默认使用
		 */
		pageTo(index, userAnimate = true) {
			let distance = -(index - 1) * SCREEN_WIDTH
			this.oTransform = {
				'transform': `translate(${distance}px, 0)`,
				'transition': userAnimate ? 'all 300ms ease-in-out 0s' : 'none'
			}
			this.cur_page = index
		},

        // 开始加载
        loading(msg = '加载中..') {
            this.isLoading = true
            return mu.loader(msg)
        },

        // 加载完成
        loadingEnd(index = -1) {
            if (typeof index !== 'number') throw new TypeError(index + '必须为number类型')
            if (index > 0) {
                mu.close(index)
            } else {
                mu.closeAll()
            }
            setTimeout(() => {
                this.isLoading = false // 延迟0.5s再释放按钮的状态
            }, 500);
        },

        /**
         * 将京东cdn图片转换为小图，仅适用于正方形图片
         * @param {string} url  图片url
         */
        thumb(url) {
            return url.replace('/jfs/', '/s100x100_jfs/')
        },

        // 获取页面数据
        async init() {
            try {
                // let id = _.getQueryString('id')
                // const res = await Api.getPageDataByID(id)

                const res = PageData

                console.log('RES:', res)

                let pageData = PageData.data

                // 页面标题
                document.title = pageData.pname
                // 封面
                this.cover = pageData.coverimg
                // 背景图，每个对象都有front、back两个属性
                this.bgs = pageData.bgs
                // 贴纸
                this.stickers = pageData.stickers

                // set assets
                this.bgs.map((bg, idx) => {
                    if (idx == 0) this.assets.push(bg.back)
                    this.assets.push(this.thumb(bg.back))

                    if (bg.front) {
                        this.assets.push(this.thumb(bg.front))
                        if (idx == 0) this.assets.push(bg.front)
                    }
                })
                // 预加载
                await this.preLoad()
                // 设置选项卡
                this.setTab()
            } catch (error) {
                mu.toast(error.message)
                throw error.message
            }
        },

        // 预加载
        async preLoad() {
            try {
                let imgs = [
                    this.cover, // 封面
                    ...this.assets, // 资源图，包含缩略前后背景图、第一张大前后背景图
                    ...Object.values(oImgs), // 本地图片
                    ...this.stickers // 贴纸
                ]
                await _.batchLoadImage(imgs)
                this.is_preload = true
            } catch (error) {
                throw error
            }
        },

        // 设置选项卡
        setTab() {
            if (this.bgs.length) {
                this.tabs.push({
                    name: '背景',
                    cont_cls: 'bgs',
                    active: true
                })
            }
            if (this.stickers.length) {
                this.tabs.push({
                    name: '贴纸',
                    cont_cls: 'stickers',
                    active: false
                })
            }
        },

        // 选项卡切换
        toggle(index) {
            this.tabs.map((tab, idx) => tab.active = idx !== index ? false : true)
        },

        /**
         * 创建舞台，设置舞台的宽高
         * 舞台比例 = 传入的参数
         */
        initStage(ratio = RATIO) {
            let action_height = this.$refs.actions.offsetHeight // 底部操作区高度
            let stagebox_height = SCREEN_HEIGHT - action_height // 舞台外容器的高度
            this.$refs.stageBox.style.height = stagebox_height + 'px' // 设置舞台高度为可见区
            let stagebox_ratio = SCREEN_WIDTH / stagebox_height // 获取舞台外层容器的比例

            let stage_width, stage_height
            // 根据外层容器，设置舞台的宽高，达到自适应显示效果
            if (stagebox_ratio <= ratio) { // 以宽为准
                stage_width = SCREEN_WIDTH
                stage_height = stage_width / ratio
            } else { // 以高为准
                stage_height = stagebox_height
                stage_width = stage_height * ratio
            }

            // 初始化舞台，获取stage实例
            this.stage = new Stage(stage_width, stage_height)
        },

        // 上传图片
        async invokeUpload(file) {
            let loader = this.loading('请稍后')
            try {
                let cut_src = 'https://img11.360buyimg.com/devfe/jfs/t1/25429/39/3255/467863/5c25a2d4E9cd6cfdf/f04de559c7094fba.png.dpg'
                
                if (!USE_DEV_CUT) {
                    cut_src = await file2cut(file)
                }

                // 初始化舞台
                this.initStage()

                this.createCutPic(cut_src)

                this.selectBg()

                // 跳转下一页
                if (this.cur_page == 1) {
                    
                    this.pageNext(false)
                }

                // 重新上传，删除人像类型的数据
                if (this.cur_page == 2) {
                    this.cells = this.cells.filter(cell => cell.config.type !== 1)
                }
            } catch (error) {
                console.log(error)
            } finally {
                this.loadingEnd(loader)
            }
        },

        // 选择背景、前景层
        async selectBg(index = 0) {
            try {
                let img = await _.loadImage(this.bgs[index].back)

                this.stage.add({
                    unique: true,
                    type: 1,
                    selected: false,
                    show_flip: false, // 镜像按钮，默认显示
                    show_del: false, // 删除按钮，默认显示
                    enable_pan: false, // 是否启动拖拽，默认可拖拽
                    enable_pinch: false, // 是否启动缩放，默认启动
                    enable_rotate: false, // 是否启动旋转，默认启动
                    enable_selected: false, // 是否启动点击被选中，默认启动

                    img: img,
                    width: this.stage.width,
                    position: [0, 0],
                })

                if (this.bgs[index].front) {
                    let front_img = await _.loadImage(this.bgs[index].front)
                    this.stage.add({
                        unique: true,
                        type: 4,
                        selected: false,
                        show_flip: false, // 镜像按钮，默认显示
                        show_del: false, // 删除按钮，默认显示
                        enable_pan: false, // 是否启动拖拽，默认可拖拽
                        enable_pinch: false, // 是否启动缩放，默认启动
                        enable_rotate: false, // 是否启动旋转，默认启动
                        enable_selected: false, // 是否启动点击被选中，默认启动

                        img: front_img,
                        width: this.stage.width,
                        position: [0, 0]
                    })
                } else {
                    this.stage.clear(4)
                }

            } catch (error) {
                throw error
            }
        },

        // 创建人像
        async createCutPic(img_url) {
            try {
                let img = await _.loadImage(img_url)

                this.stage.add({
                    type: 2,
                    show_del: false,
                    show_copy: true,
                    
                    img: img,
                    width: this.stage.width * 0.75,
                    position: ['center', 5],
                    direction: 4
                })

            } catch (error) {
                throw error
            }
        },

        // 创建贴纸
        async createSticker(index) {
            try {
                let img = await _.loadImage(this.stickers[index])

                this.stage.add({
                    type: 3,
                    img: img,
                    width: this.stage.width * 0.3,
                    mode: 'random',
                    position: [40, 40],
                })

            } catch (error) {
                throw error
            }
        },

        // 打开贴纸文字编辑弹层
        openTextBoard(status, cell) {
            let board = this.edit_board
            if (status == 'add') {
                board.text = ''
                board.selected_color = board.colors[2]
            }
            if (status == 'edit') {
                board.current_id = cell.id
                board.selected_color = cell.config.color
                board.text = cell.config.text
            }
            board.show = true
            board.status = status
        },

        // 保存编辑弹层
        saveTextBoard() {
            let board = this.edit_board
            if (board.status == 'add') { // 新增
                if (board.text) {
                    this.stage.add({
                        cls: 'cell-text',
                        type: 5,
                        show_flip: false,
                        show_edit: true,
                        text: board.text,
                        color: board.selected_color,
                        position: [20, 20],
                    })
                }
            }
            if (board.status == 'edit') { // 修改
                // 遍历所有元件，找到编辑时打开的元件
                this.stage.cells.forEach(cell => {
                    if (cell.id == board.current_id) {
                        cell.config = Object.assign({}, cell.config, {
                            text: board.text,
                            color: board.selected_color
                        })
                    }
                })
            }
            board.show = false
        },

        // 创建海报
        async createPoster() {
            let idx = this.loading('制作中..')
            try {
                // 定义海报宽度
                const POSTER_WIDTH = 2000
                // 获取舞台转换成的canvas
                let poster_canvas = this.stage.toCanvas(POSTER_WIDTH)
                // 海报与舞台的比例
                let scale = POSTER_WIDTH / this.stage.width
                // 创建海报实例，传入了它们的比例
                let poster = new Poster(scale)
                // 获取二维码
                let qrcode = this.getQrcode()
                // 预加载图片，返回img对象
                let [ poster_footer, poster_code ] = await _.batchLoadImage([oImgs.footer, qrcode])
                // 等比获取图片在POSTER_WIDTH下的高度
                let foot_height = POSTER_WIDTH / (poster_footer.width / poster_footer.height)
                // 获取二维码在画布中的大小
                let code_height = foot_height * 0.75
                // 制作海报
                poster.create(POSTER_WIDTH, foot_height)
                    // .rect('#000')
                    // .drawImage(poster_footer, 0, 0, POSTER_WIDTH, foot_height)
                    .drawText('长按图片扫描二维码\n马上制作一张', 50, 'center', {
                        font_size: 20,
                        line_height: 2,
                        // bg_color: '#f00',
                        bold: '900'
                    })
                    // .bg('#ff0')
                    .drawImage(poster_code, 50, 'center', code_height, code_height, 2)
                    .prepend([poster_canvas])
                    .border([100])

                // 导出海报
                this.poster = poster.canvas.toDataURL('image/jpeg', 0.9)

                await this.navigate2poster()

            } catch (error) {
                console.log(error)
                mu.toast(error.message)
            } finally {
                this.loadingEnd(idx)
            }
        },

        /**
         * 获取二维码
         */
        getQrcode() {
            // 创建元素
            let el = document.createElement('div')
            el.id = 'qrcode_' + (+new Date())
            document.body.appendChild(el)

            var qrcode = new QRCode(el, {
                text: 'http://www.baidu.com',
                width: 240,
                height: 240,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            })

            let b64 = qrcode._oDrawing._elCanvas.toDataURL('image/png', 0.9)

            document.body.removeChild(el)

            return b64
        },

        // 保存相册
        saveToAlbum() {
            mu.toast('长按图片可保存到相册')
        },

        /**
         * 跳转海报页
         * h5 -> 直接跳转下一页
         * 小程序 -> 跳转小程序的海报页，url带上需要的参数
         */
        async navigate2poster() {
            try {
                if (_wx_.isMiniProgram) {
                    let blob = _.dataURL2blob(this.poster)
                    let url = await Api.getImgUrl(blob)
                    const obj = {
                        id: '62C7AA1CC8FEB87D',
                        url: url,
                        appId: 'wx6c17702b350fb3f8',
                        path: 'pages/honor'
                    }
                    wx.miniProgram.navigateTo({
                        url: `poster?${_.obj2str(obj)}`,
                    })
                } else {
                    this.pageNext()
                }
            } catch (error) {
                throw error
            }
        },

        /**
         * 再做一张
         */
        replay() {
            this.pageTo(1)
            this.cells = []
        },

        // 将文本中的`\n`转化为`<br />`
        _n2br(str) {
            return str.replace(/\n/g, '<br />')
        },

    },

    created() {

    },

    async mounted() {
        try {
            await this.init()
            if (USE_DEV_CUT) {
                this.invokeUpload()
            }
        } catch (error) {
            console.log(error)
        }
    },

    computed: {
        isWeiXin() {
            return _wx_.isWeixin()
        },
    }
})