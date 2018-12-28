/**
 通用弹层展示效果
 --------------
 @描述：动画效果采用 transition（过渡）实现，非 animation（动画）
 @命名规范
  使用BEM命名规范，b和e之间用单横线（-），e和m之间使用双横线（--）
    B：block块，此处为mu_modal
    E：element元素，此处为一些遮罩层，容器等
    M：modifier修饰符，元素状态，此处为in等过渡状态
 @API
    mu.open({
        type: 'default',          // {String} 弹层类型，default（默认）、slide、toast、alert、loading
        content: '',              // {String/Function} 弹层内容，字符串时直接展示，函数时请参考demo
        mask: true,               // {Boolean/string} 是否显示遮罩层，默认显示，字符串时可自定义样式
        maskClose: true,          // {Boolean} 点击遮罩层是否可以关闭弹层
        delay: 0.25,              // {Number} 移除过渡样式后多久销毁弹层
        time: 0,                  // {Number} 延迟几秒后弹层消失
        animate: 'scale',         // {String} 弹层弹出时的动画类型，scale（默认）、fade、slide、up
        style: '',                // {String} 设置main容器的style属性
        className: '',            // {String} 设置main容器的自定义样式
        btn: false,               // {string/Array/Boolean} alert类型时的按钮文案
        open: function () {},     // {Function} 钩子函数，弹层被插入到dom后触发
        close: function () {},    // {Function} 钩子函数，弹层被销毁后触发
        yes: function(index) {},  // {Function} alert类型的确定按钮，单个或者多个右侧的按钮
        no: function() {}         // {Function} alert类型的取消按钮
    })
 @关闭弹层:
    mu.open()会返回一个number类型的值：index，在其他地方mu.close(index)即可
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.mu = factory(root);
    }
}(window, function () {

    var pre = 'mu_modal',
        index = 0,
        _mu = {}; // key为index索引，弹层销毁后会删除key

    var q = function (cls, isAll) {
        isAll = isAll || false
        if (!isAll) {
            return document.querySelector(cls)
        }
        return document.querySelectorAll(cls)
    };

    // css命名规范 (b:block  e:element  m:modifier)
    var getBEM = function (e, m) { // block = pre
        return pre + (e ? ('-' + e) : '') + (m ? ('--' + m) : '')
    };

    // 根据index获取容器下对应的元素
    var getElem = function (index) {
        var _wrap = q('#' + pre + '-' + index);
        if (!_wrap) return false;
        var _mask = _wrap.querySelector('.' + getBEM('mask'));
        var _main = _wrap.querySelector('.' + getBEM('container')).children[0];
        return {
            wrap: _wrap,
            mask: _mask,
            main: _main
        }
    };

    function MU(options) {
        this.opts = extend({
            type: 'default', // 弹层类型，默认为中间弹出 目前支持：slide、toast、alert、loading
            content: '', // 弹层内容
            mask: true, // 是否显示遮罩层，默认显示
            maskClose: true, // 点击遮罩层是否可以关闭弹层
            delay: 0.25, // 关闭弹层时的过渡动画持续时间
            time: 0, // 延迟几秒后消失
            animate: 'scale', // 弹层弹出时的动画类型，目前支持：scale（默认）、fade、slide、up
            style: '', // 设置main容器的style属性
            className: '', // 设置main容器的自定义样式
            btn: false // alert类型时的按钮文案
        }, options);

        this.init();
    }

    MU.prototype = {
        constructor: MU,
        init: function () {
            // 暴露信息给全局对象
            _mu[index] = {
                config: this.opts,
                duration: {}, // 存放一堆弹层持续时间的定时器对象
                delay: {} // 存放一堆弹层消失后多久销毁的定时器对象
            };
            this.insert()
        },
        insert: function () {
            var me = this, 
                config = this.opts;

            var _wrap = document.createElement('div');
            _wrap.id = pre + '-' + index; // 定义id
            _wrap.className = getBEM('wrap');
            _wrap.setAttribute('type', config.type);

            [].slice.call(q('.' + getBEM('wrap'), true)).forEach(function (_wrap) {
                var type = _wrap.getAttribute('type');
                var index = _wrap.id.split(pre + '-')[1];
                if (type === config.type) { // 同类型弹层只允许出现一个
                    mu.close(index)
                }
            })

            if (config.type === 'toast') {
                config.mask = false;
            }

            if (config.type === 'alert') {
                config.content = '<div class="' + getBEM('alert_content') + '">' + config.content + '</div>'
            }

            if (config.type === 'slide') {
                config.animate = 'slide'
            }

            if (config.type === 'loading') {
                config.animate = false;
                config.content = config.content ? '<p>'+config.content+'</p>' : config.content
            }

            //按钮区域
            var getButton = (function () {
                typeof config.btn === 'string' && (config.btn = [config.btn]);
                var btns = (config.btn || []).length,
                    btndom;
                if (btns === 0 || !config.btn) {
                    return '';
                }
                config.btn = config.btn.reverse()
                btndom = '<span yes type="1">' + config.btn[0] + '</span>'
                if (btns === 2) {
                    btndom = '<span no type="0">' + config.btn[1] + '</span>' + btndom
                }
                return '<div class="' + getBEM('alert_btns') + '">' + btndom + '</div>';
            }());

            var mask_cls = [
                getBEM('mask'),
                config.animate ? getBEM('fade') : '' // 遮罩层固定使用fade或false
            ].join(' ');

            var main_cls = [
                getBEM('main'),
                getBEM(config.type), // 主类型类名，控制元素的展现形式，slide就定位，toast就半透明居中
                (config.from ? getBEM(config.type + '_' + config.from) : null), // 元素过渡前的位置，slide中使用
                (config.className ? config.className : null), // 自定义类名
                config.animate ? getBEM(config.animate) : ''
            ].filter(function (cls) { return cls }).join(' ');

            // async load content
            if (typeof config.content === 'function') {
                config.content = config.content.call(this, function (content) {
                    getElem(me.index).main.innerHTML = content
                })
            }

            _wrap.innerHTML = [
                (config.mask ? '<div style="'+ (typeof config.mask === 'string' ? config.mask : '') +'" class="' + mask_cls + '"></div>' : ''),
                '<div class="' + getBEM('container') + '">',
                    '<div class="' + main_cls + '" style="' + (config.style ? config.style : '') + '">',
                        (config.title ? '<div class="' + getBEM('title') + '">' + config.title + '</div>' : ''),
                        config.content,
                        config.btn ? getButton : '',
                    '</div>',
                '</div>',
            ].join('');

            q('body').appendChild(_wrap);

            this.index = index++;
            this.emit(config);

            typeof _mu[this.index].config.open === 'function' && _mu[this.index].config.open.call(this)
        },
        emit: function (config) {
            var me = this,
                el = getElem(this.index);

            el.wrap.offsetWidth; // 效果等同于 setTimeout 0 不加此语句在添加in时，元素无法产生过渡效果
            config.animate && addClass(el.main, getBEM(config.animate, 'in'))
            if (config.mask && el.mask) {
                config.animate && addClass(el.mask, getBEM('fade', 'in')) // 遮罩层固定使用fade或false
                config.maskClose && el.mask.addEventListener('click', function () {
                    mu.close(me.index)
                })
            }

            if (config.btn) {
                var btns = q('.' + getBEM('alert_btns') + ' ' + 'span', true);
                [].slice.call(btns).forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var type = this.getAttribute('type');
                        if (type == 0) {
                            config.no && config.no();
                            mu.close(me.index);
                        } else {
                            config.yes ? config.yes(me.index) : mu.close(me.index);
                        }
                    })
                })
            }

            if (config.time) {
                _mu[this.index].duration = setTimeout(function () {
                    mu.close(me.index)
                }, config.time * 1000);
            }

        }

    };

    // Tools
    function extend(target, options) {
        for (var n in options) {
            target[n] = options[n];
        }
        return target;
    }

    function hasClass(ele, cls) {
        cls = cls || '';
        if (cls.replace(/\s/g, '').length == 0) return false; //当cls没有参数时，返回false
        return new RegExp(' ' + cls + ' ').test(' ' + ele.className + ' ');
    }

    function addClass(ele, cls) {
        if (!hasClass(ele, cls)) {
            ele.className = ele.className == '' ? cls : ele.className + ' ' + cls;
        }
    }

    function removeClass(ele, cls) {
        if (hasClass(ele, cls)) {
            var newClass = ' ' + ele.className.replace(/[\t\r\n]/g, '') + ' ';
            while (newClass.indexOf(' ' + cls + ' ') >= 0) {
                newClass = newClass.replace(' ' + cls + ' ', ' ');
            }
            ele.className = newClass.replace(/^\s+|\s+$/g, '');
        }
    }

    function removeNode(node, pNode) {
        pNode = pNode || q('body')
        if (node.parentNode === pNode) {
            pNode.removeChild(node)
        }
    }

    var mu = {

        v: '1.0.0',

        // 基础api
        open: function (options) {
            var mu = new MU(options || {});
            return mu.index
        },

        // toast简写
        toast: function (msg, time) {
            this.open({
                type: 'toast',
                content: msg,
                time: time || 1.5
            })
        },

        // 加载简写
        loader: function (msg) {
            msg = msg || '加载中..'
            return this.open({
                type: "loading",
                mask: false,
                content: msg 
            })
        },

        // 关闭指定弹层
        close: function (index) {
            var el = getElem(index);
            if (!el) return;

            var config = _mu[index].config;

            el.mask && removeClass(el.mask, getBEM('fade', 'in'))
            removeClass(el.main, getBEM(config.animate, 'in'))

            var _delay = config.animate ? config.delay * 1000 : 0;

            clearTimeout(_mu[index].delay)
            _mu[index].delay = setTimeout(function () {
                removeNode(el.wrap)
                typeof _mu[index].config.close === 'function' && _mu[index].config.close()
                delete _mu[index]
            }, _delay);
        },

        // 关闭所有弹层
        closeAll: function () {
            var wraps = q('.' + getBEM('wrap'), true);
            if (wraps.length) {
                [].slice.call(wraps).forEach(function (wrap) {
                    removeNode(wrap)
                })
            }
        }
    }

    window.mu = mu

    return mu

}));
