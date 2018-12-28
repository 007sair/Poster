/**
 * 浏览器 navigator.userAgent 判断
 */

export default function () {
    var u = navigator.userAgent
    return {
        // IE内核
        trident: u.indexOf('Trident') > -1,
        // opera内核
        presto: u.indexOf('Presto') > -1,
        // 苹果、谷歌内核
        webKit: u.indexOf('AppleWebKit') > -1,
        // 火狐内核
        gecko: u.indexOf('Gecko') > -1 && u.indexOf('KHTML') == -1,
        // 是否为移动终端
        mobile: !!u.match(/AppleWebKit.*Mobile.*/),
        // ios终端
        ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), 
        // android终端
        android: u.indexOf('Android') > -1 || u.indexOf('Adr') > -1,
        // 是否为iPhone或者QQHD浏览器
        iPhone: u.indexOf('iPhone') > -1,
        // 是否iPad
        iPad: u.indexOf('iPad') > -1, 
        // 是否web应该程序，没有头部与底部
        webApp: u.indexOf('Safari') == -1, 
        // 是否微信
        weixin: u.indexOf('MicroMessenger') > -1, 
        // 是否QQ
        qq: u.match(/\sQQ/i) == " qq", 
        // ios版本
        iosv: u.substr(u.indexOf('iPhone OS') + 9, 3), 
        // 么么照APP
        mmzApp: u.indexOf('_mmz_') > -1
    };
}