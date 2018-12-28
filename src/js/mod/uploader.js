/**
 * 微信JDSDK 上传图片组件
 * --------------------
 * 依赖：wx 对象
 * 调用：
  ```html
    // invokeUpload 为组件外部方法，参数为file对象
    // *属性有驼峰时需转换为-连接
    <uploader @upload="invokeUpload" :disabled="false" button-text="开始上传"></uploader>
  ```
 */
import _ from '@/js/lib/tool'

export default {
    props: {
        disabled: {
            type: Boolean,
            required: true
        },
        buttonText: {
            type: String,
            required: false
        }
    },
    data() {
        return {

        }
    },
    template: `
        <a class="cp-upload" v-if="enableWxUpload" :disabled="disabled" @click="fireUpload" href="javascript:;">
            <span v-if="buttonText" class="btn-text">{{buttonText}}</span>
        </a>
        <a class="cp-upload" v-else href="javascript:;">
            <span v-if="buttonText" class="btn-text">{{buttonText}}</span>
            <input :disabled="disabled" @change="fireChange" name="upload" type="file" accept="image/*" />
        </a>
    `,
    methods: {
        /**
         * 微信和原生上传都会在这里出发外部调用
         * @param {File} file file文件
         */
        emit(file) {
            if (this.testType(file)) {
                this.$emit('upload', file)
            } else {
                mu.toast('请上传正确格式的图片')
            }
        },

        /**
         * 微信JS_SDK上传
         * 依赖 wx 全局对象
         */
        fireUpload() {
            let me = this
            if ('wx' in window) {
                wx.chooseImage({
                    count: 1, // 默认9
                    sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
                    sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
                    success: function (res) {
                        // var localIds = res.localIds; // 返回选定照片的本地ID列表，localId可以作为img标签的src属性显示图片
                        // Tips: 目前已知ios8以上可以使用 getLocalImgData api
                        wx.getLocalImgData({
                            localId: res.localIds[0],
                            success: function (res) {
                                // localData是图片的base64数据，可以用img标签显示
                                let localData = res.localData
                                // iOS 系统里面得到的数据，类型为 image/jgp,因此需要替换一下
                                localData = localData.replace('jgp', 'jpeg')
                                let file = _.dataURL2blob(localData)
                                me.emit(file)
                            }
                        })
                    },
                    fail(e) {
                        console.log(e)
                    }
                })
            } else {
                throw new Error('wx对象不存在，请确保引入wx_jssdk.js')
            }
        },

        /**
         * 原生上传事件，onChange触发
         * @param {Event} e 事件对象
         */
        fireChange(e) {
            if (!e.target.files.length) {
                mu.toast('请上传文件')
                return false
            }
            this.emit(e.target.files[0])
            e.target.value = ''
        },

        /**
         * 校验文件类型
         * @param {File} file file文件对象
         */
        testType(file) {
            let pass = false;
            if (/gif|jpg|jpeg|png/.test(file.type.toLowerCase())) {
                pass = true
            }
            // 某些安卓机型获取到的图片类型为空
            if (this.isAndroid && file.type == '') pass = true
            return pass
        }

    },

    computed: {
        // 只在`ios`&`微信`内 使用微信jssdk提供的上传图片功能
        enableWxUpload() {
            return this.isIos && this.isWeixin
        },
        // 是否是微信
        isWeixin() {
            return /micromessenger/.test(navigator.userAgent.toLowerCase())
        },
        // 是否ios系统
        isIos() {
            let u = navigator.userAgent
            return !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)
        },
        // 是否是安卓
        isAndroid() {
            let u = navigator.userAgent
            return u.indexOf('Android') > -1 || u.indexOf('Adr') > -1
        }
    }
}
