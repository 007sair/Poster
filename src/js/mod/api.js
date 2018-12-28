/**
 * 页面Api
 */

import axios from 'axios'

export default {

    base: 'https://fashionai.jd.com/',

    /**
     * 根据url中携带的参数id，获取页面数据
     * @param {String} id  前后端约定的id值，来自url的id参数
     */
    async getPageDataByID(id) {
        try {
            if (!id) throw new Error('id错误')
            const res = await axios.get(`${this.base}bg/getinfo/${id}`, {
                withCredentials: true, // 默认的
            })
            if (res.status == 200) {
                const resData = res.data
                if (resData.code == 0) {
                    return resData.data
                } else {
                    throw new Error(resData.msg)
                }
            } else {
                throw new Error('Status Code Error')
            }
        } catch (error) {
            throw error
        }
    },

    /**
     * 上传文件对象，返回一个url
     * @param {FileObject} file  file文件对象
     */
    async getImgUrl(file) {
        try {
            var fd = new FormData();
            fd.append("file", file)
            fd.append("appKey", 'vinci321')

            let res = await axios.post(`${this.base}bg/img/upload`, fd, {
                withCredentials: true,
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            if (res.status == 200) {
                if (res.data.code == 0) {
                    return res.data.img_url
                } else {
                    throw new Error(res.data.msg)
                }
            } else {
                throw new Error('Status Code Error')
            }
        } catch (error) {
            throw error
        }
    },

    /**
     * 传入文件对象，获取抠图、脸部、身体坐标信息
     * @param {Object}    file        传入的file对象或者blob对象
     * @param {Boolean}   is_mask     是否获取mask图片，1-获取，0-不获取
     */
    async getCutPic(file, is_mask = 1) {
        if (__DEV__) {
            console.time('getCutPic')
        }
        try {
            let fd = new FormData()
            fd.append('file', file)
            fd.append('appKey', 'vinci321')
            fd.append('usemask', is_mask)
            fd.append('boxonly', 0)

            const res = await axios({
                data: fd,
                method: 'post',
                url: `${this.base}activity/person/location`,
            })
            if (res.status == 200) {
                if (res.data.code == 0) {
                    return res.data.data
                } else {
                    throw new Error(res.data.msg)
                }
            } else {
                throw new Error(res.statusText)
            }
        } catch (error) {
            throw error
        } finally {
            if (__DEV__) {
                console.timeEnd('getCutPic')
            }
        }
    },

    /**
     * 获取小程序二维码
     * @param {Object} data 参数数据
     * data.page      {string}    必填，小程序页面page，如：'pages/home/index'
     * data.scene     {string}    必填，场景值，一般用于区别活动
     * data.version   {string}    选填，如果传入的值有效，返回数据里hidden将为1，表示隐藏小程序码
     * Via: https://developers.weixin.qq.com/miniprogram/dev/api/qrcode.html
     */
    async getWxCode(data) {
        try {
            // 传入参数
            const config = Object.assign({}, {
                page: '',
                scene: data.scene ? data.scene : 'scene', // 必传，不填时默认为字符串
                version: '' // 此值是否有效，取决于前后端是否有约定
            }, data)
            if (config.scene.length > 32) throw new Error('最大32个可见字符');
            const res = await axios({
                method: 'post',
                url: `${this.base}bg/appcode`,
                params: config
            })
            if (res.status == 200) {
                let resData = res.data
                if (resData.code == 0) {
                    return resData.data
                } else {
                    throw new Error(resData.msg)
                }
            } else {
                throw new Error('Status Code Error')
            }
        } catch (error) {
            throw error
        }
    }
}