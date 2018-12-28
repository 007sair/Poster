/**
 * 微信JS_SDK相关功能
 * @author by longchan
 * @update by longchan at 2018-12-03
 * ----------------------------------
 * 内部流程：
   1. 根据当前环境，自动注入微信`sdk`脚本；
   2. 轮询监测`wx`对象是否在`window`中；
   3. 获取`sdk`配置，触发`wx.ready`
 * 外部调用：
   ```js
   import WX from 'wx.js' // 引用当前脚本
   let _wx_ = new WX(options) // options可以配置默认信息
   ```
 * 绑定事件：
   ```js
   _wx_.on('injected', function() {
     // 注册`injected`事件，注入SDK后会触发，this为当前实例，即_wx_
   })
   _wx_.on('ready', function() {
     // 注册`ready`事件，`wx.ready`时触发，this为当前实例，即_wx_
   }) 
   ```
 * 使用分享：
   ```js
   // 同步分享
   new WX({
     shareInfo: {} // 传入分享信息，不传入将使用默认分享配置
   })
   // 异步分享
   _wx_.on('ready', function() {
     this.setShare({}) // 此方法可在异步中进行调用，注意`this`即可
   })
   ```
 * 判断环境：
   ```js
   // 是否微信
   _wx_.isWeixin() // true-是  false-否
   // 是否是小程序，仅在用户异步调用时可用
   // 若需要页面加载初就判断小程序环境，可在`injected`事件内判断`isMiniProgram`
   _wx_.isMiniProgram // true-是  false-否
   ```
 */

import axios from 'axios'

class WX {

    constructor(options) {
        // 默认配置信息，属性驼峰命名
        this.config = Object.assign({
            debug: __DEV__ ? true : false, // 是否开启`debug`
            maxPollingTime: 5, // 最大轮询时间，单位:秒
            jsApiList: [], // 追加`apiList`
            scriptUrl: 'https://res.wx.qq.com/open/js/jweixin-1.3.2.js', // sdk url
            // 分享信息
            shareInfo: {
                title: '分享标题', // 分享标题
                desc: '分享描述', // 分享描述
                link: window.location.href.split('#')[0], // 分享链接
                imgUrl: '', // 分享图标
            }
        }, options)

        // jssdk版本号
        this.version = this._getVersion()

        // 是否小程序环境，当`init`执行后如果是小程序，此值会变为`true`，时间取决于网速
        // 注意：由于微信逻辑限制，只能被动判断当前环境，无法像判断`UA`那样主动获取环境
        this.isMiniProgram = false

        // 事件列表，key为事件名
        this.eventList = {}

        // 是否超时
        this.isTimeout = false

        // 初始化
        this.init()
    }

    /**
     * 核心方法，初始化相关功能
     * 如果是在微信内（小程序内也为true），我们需要插入微信的`JSSDK`
     */
    async init() {
        try {
            let me = this
            // 非微信环境不做任何处理
            if (!this.isWeixin()) return
            // 插入微信sdk
            this.inject(this.config.scriptUrl)
            // 同时处理轮询与获取配置信息
            let [wx, config] = await Promise.all([
                this.testProp('wx'), // 轮询`window`对象中是否存在`wx`属性，轮询时间取决于`maxPollingTime`
                this.getConfig() // 获取wx.config配置信息
            ]);
            // 判断当前环境，修改`isMiniProgram`的值
            this._getEnv()
            // 触发事件
            this.emit('injected')
            // 配置config
            wx.config({
                debug: this.config.debug, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
                appId: config.appId, // 必填，企业号的唯一标识，此处填写企业号corpid
                timestamp: config.timestamp, // 必填，生成签名的时间戳
                nonceStr: config.nonceStr, // 必填，生成签名的随机串
                signature: config.signature,// 必填，签名，见附录1
                jsApiList: this.config.jsApiList.concat([
                    'checkJsApi', 'chooseImage', 'getLocalImgData', 'onMenuShareTimeline', 'onMenuShareAppMessage'
                ]) // 必填，需要使用的JS接口列表
            });
            // config信息验证后会执行ready方法，所有接口调用都必须在config接口获得结果之后，config是一个客户端的异步操作，所以如果需要在页面加载时就调用相关接口，则须把相关接口放在ready函数中调用来确保正确执行。对于用户触发时才调用的接口，则可以直接调用，不需要放在ready函数中。
            wx.ready(function () {
                console.log('微信JS SDK配置成功！')
                me.setShare()
                me.emit('ready')
            });
        } catch (error) {
            console.log(error.message)
        }
    }

    // 是否在微信浏览器下，小程序目前也为true
    isWeixin() {
        return /micromessenger/.test(navigator.userAgent.toLowerCase())
    }

    // 获取jssdk的版本号
    _getVersion() {
        return this.config.scriptUrl.match(/jweixin-(.*).js/)[1]
    }

    // 判断环境是不是小程序
    _getEnv() {
        try {
            let me = this
            function ready() {
                me.isMiniProgram = window.__wxjs_environment === 'miniprogram'
                if (!me.isMiniProgram && 'wx' in window && wx.miniProgram) {
                    wx.miniProgram.getEnv(function (res) {
                        me.isMiniProgram = res.miniprogram
                    })
                }
            }
            if (!window.WeixinJSBridge || !WeixinJSBridge.invoke) {
                // 非微信环境下，此事件并不执行，所以无法主动判断环境
                document.addEventListener('WeixinJSBridgeReady', ready, false)
            } else {
                ready()
            }
        } catch (error) {
            console.log(error.message)
        }
    }

    /**
     * 注入script标签到dom中
     * @param {String} src 脚本url
     * @param {Boolean} _async 是否异步，默认异步
     */
    inject(src, _async = true) {
        let s, t;
        s = document.createElement("script");
        s.type = "text/javascript";
        s.src = src;
        s.async = _async
        t = document.getElementsByTagName("script")[0];
        t.parentNode.insertBefore(s, t);
    }

    /**
     * 检测属性是否存在
     * @param {String} prop 对象属性
     */
    async testProp(prop) {
        return new Promise((resolve, reject) => {
            if (typeof prop !== 'string') reject('参数必须是字符串类型')
            if (window[prop]) resolve(window[prop])

            let p1 = this.polling(prop)
            let p2 = this.timeout(this.config.maxPollingTime, `Polling time out, can't find wx in window`)
            // 赛跑，5s内返回p1，说明获取到对象
            Promise.race([p1, p2]).then(resolve).catch(err => {
                this.isTimeout = true;
                reject(err)
            })
        })
    }

    /**
     * 超时
     * @param {Number} time 超时时间，单位：秒
     * @param {String} errMsg 超时错误信息
     */
    timeout(time, errMsg) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error(errMsg));
            }, time * 1000);
        })
    }

    /**
     * 轮询
     * @param {String} prop 对象属性
     */
    polling(prop) {
        return new Promise((resolve, reject) => {
            let timer = setInterval(() => {
                if (this.isTimeout || prop in window) {
                    clearInterval(timer)
                }
                if (prop in window) {
                    resolve(window[prop])
                }
            }, 16);
        })
    }

    /**
     * 获取配置信息
     */
    async getConfig() {
        try {
            let url = '//aifashion.jd.com/activity/wx/sdk/js'
            if (__DEV__) {
                url = '//wxfashion.jd.com/activity/test/wx/sdk/js'
            }
            let res = await axios({
                url: url,
                method: 'get',
                params: {
                    key: '1e980d18c58678dea102c12',
                    // url需要encodeURIComponent，后台decodeURIComponent解码
                    url: window.location.href.split('#')[0],
                }
            })
            if (res.status == 200) {
                if (res.data.code == 0) {
                    return JSON.parse(res.data.data)
                } else {
                    throw new Error(res.data.msg)
                }
            } else {
                throw new Error(res.statusText)
            }
        } catch (error) {
            throw error
        }
    }

    /**
     * 设置H5分享
     * @param {Object} obj 配置信息
     */
    setShare(obj = {}) {
        // 合并分享信息
        let share_info = Object.assign({}, this.config.shareInfo, obj)
        // 获取“分享到朋友圈”按钮点击状态及自定义分享内容接口
        wx.onMenuShareTimeline({
            title: share_info.title, // 分享标题
            link: share_info.link,
            imgUrl: share_info.imgUrl // 分享图标
        });
        // 获取“分享给朋友”按钮点击状态及自定义分享内容接口
        wx.onMenuShareAppMessage({
            title: share_info.title, // 分享标题
            desc: share_info.desc, // 分享描述
            link: share_info.link,
            imgUrl: share_info.imgUrl // 分享图标
        });
    }

    /**
     * 绑定事件
     * @param {String} eventName 事件名
     * @param {Function} cb 回调函数，函数内部this为实例对象
     */
    on(eventName, cb) {
        this.eventList[eventName] = cb
    }

    /**
     * 触发事件
     * @param {String} eventName 事件名
     */
    emit(eventName) {
        if (this.eventList[eventName]) {
            this.eventList[eventName].call(this)
        } else {
            // console.error('没有对应的事件名：', eventName);
        }
    }

}


export default WX