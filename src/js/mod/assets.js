/**
 * 导出图片资源
 */

/**
 * 导出对象，结构：{ key: 目录+图片名称，value: 图片路径+hash }
 * 如，图片在img目录下：{ footer: /images/footer.png?v=fe328c7977 }
 * 或者，图片在img的`bgs`目录下：{ bgs/footer: /images/bgs/footer.png?v=fe328c7977 }
 */
let exportObj = {}

/**
 * 根据`context`批量导入`@/assets/img/`下的所有图片
 * 效果类似批量使用`require('@/assets/img/bgs/[1.png, 2.png, 3.png, ...]')`
 * !!!注意：这种导出方式，导出的图片顺序有问题。如果对图片顺序有要求，需自行书写排序规则。
 */
function importAll(r) {
    if (__DEV__) {
        console.log('↓↓↓↓ 图片资源地址：↓↓↓↓');
    }
    r.keys().forEach(p => {
        let folder = p.replace(/(.*\/)*([^.]+).*/ig, "$1").replace('./', '');
        let name = p.replace(/(.*\/)*([^.]+).*/ig, "$2");
        let ext = '.' + p.replace(/.+\./, "");
        let all = require('@/assets/img/' + folder + name + ext)
        exportObj[folder+name] = all

        if (__DEV__) {
            console.log(folder + name, ':', all);
        }
    })
    if (__DEV__) {
        console.log('↑↑↑↑ /图片资源地址：↑↑↑↑');
    }
}

importAll(require.context('@/assets/img/', true, /\.*$/))

export default exportObj