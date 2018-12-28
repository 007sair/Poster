// 获取到一个CSSStyleDeclaration对象，它是一个CSS属性键值对的集合。
var divStyle = document.createElement("div").style;

/**
 * 将css前缀转为驼峰规则，如：-webkit-box-pack -> WebkitBoxPack
 * @param {String} str css写法前缀
 */
function camelCase(str) {
    return (str + "")
        .replace(/^-ms-/, "ms-")
        .replace(/-([a-z]|[0-9])/gi, function (all, letter) {
            return (letter + "").toUpperCase();
        });
}

/**
 * 将驼峰写法前缀转换为 -xx- 写法
 * @param {String} str 驼峰式写法
 */
function unCamelCase(str) {
    return str.replace(/([A-Z]|^ms)/g, "-$1").toLowerCase();
}

/**
 * 返回当前浏览器的前缀，如：chrome下返回 -webkit-  字符串
 */
function cssVender() {
    var ds = divStyle,
        cases = ["-webkit-", "-moz-", "-ms-", "-o-", ""],
        i = 0;
    do {
        if (camelCase(cases[i] + "transform") in ds) {
            return cases[i];
        }
    } while (++i < cases.length);
    return "";
}

/**
 * 返回浏览器支持的带前缀属性，如：chrome下，box-pack -> -webkit-box-pack
 * @param {String} property 传入的css属性名
 */
function fixCSS(property) {
    var ds = divStyle,
        pre = cssVender();
    return (
        (camelCase(property) in ds && property) ||
        (camelCase(pre + property) in ds && pre + property) ||
        property
    );
}

/**
 * 返回js特性的前缀，如：chrome下，box-pack -> WebkitBoxPack
 * @param {String} property 传入css属性名
 */
function isCSS(property) {
    var name = camelCase(fixCSS(property));
    return (name in divStyle && name) || "";
}

/**
 * 返回带有css私有前缀对象
 * @param {Object} cssObj css属性-值 对象
 */
function prefix(cssObj) {
    let obj = {};
    Object.keys(cssObj).forEach(p => {
        let k = fixCSS(p);
        obj[k] = cssObj[p];
    });
    return obj;
}

export {
    divStyle,
    camelCase,
    unCamelCase,
    cssVender,
    fixCSS,
    isCSS,
    prefix
}