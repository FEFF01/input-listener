# InputListener
### 鼠标触屏点击、拖拽、缩放、旋转手势监听，和任意普通按键与组合键监听
 
> * [手势和键盘监听的测试链接](https://feff01.github.io/InputListener/dist/test.html)

```
    npm install input-listener
```

```javascript

    import InputListener from 'input-listener';
    //const InputListener = require('input-listener');

    /**
     * @description 
     * @param {HTMLElement} 被监听的目标元素
     * @param {Object} events 可指定任意 key 不相同的监听
     * @param {?Object} options 同原生 addEventListener 方法的第三个参数
     */
    new InputListener(element,{

        /**
         * @description 鼠标或第一个触点按下时触发
         * @param {Event}
         */
        dragStart:console.log.bind(console,"dragStart"),

        /**
         * @description 鼠标或第一个触点（只存在一个触点时）按下并拖动时触发
         * @param {Event} 
         * @param {Object.x} 距离上次响应移动的x轴距离
         * @param {Object.y} 距离上次响应移动的y轴距离
         */
        dragMove:console.log.bind(console,"dragMove"),

        /**
         * @description 鼠标或最后一个触点弹起时触发
         * @param {Event} 
         */
        dragEnd:console.log.bind(console,"dragEnd"),

        /**
         * @description 当存在两个或以上触点时，第一或第二个触点移动时触发
         * @param {Event} 
         * @param {Object.x} 距离上次响应移动的x轴距离
         * @param {Object.y} 距离上次响应移动的y轴距离
         */
        dragMove2:console.log.bind(console,"dragMove2"),

        /**
         * @description 响应双指缩放手势
         * @param {Event} 
         * @param {number} 缩放距离（px）
         * @param {?Object.x} 首次触发缩放手势时该参数表示触发时缩放中心点x
         * @param {?Object.y}  首次触发缩放手势时该参数表示触发时缩放中心点y
         */
        scale:console.log.bind(console,"scale"),

        /**
         * @description 响应双指旋转手势
         * @param {Event} 
         * @param {number} 旋转弧度
         * @param {?Object.x} 首次触发旋转手势时该参数表示触发时旋转中心点x
         * @param {?Object.y}  首次触发旋转手势时该参数表示触发时旋转中心点y
         */
        rotate:console.log.bind(console,"rotate"),

        /**
         * @description 可用于组合键监听或者按键按下的监听（每个组合键或按键用 "," 分隔，可用 "|" 代表监听链中的"或"光系）
         * @param {Event} 
         * @param {string} 按键路径（类似 "alt+a" "arrowup+q+s" "w" 的字符串）
         */
        "alt|ArrowUp+a,arrowup+a|q+s,w_keyDown":console.log.bind(console,"keyDown"),

        /**
         * @description 监听指定的按键弹起（每个按键用 "," 分隔）
         * @param {Event} 
         */
        "alt,a,s,d_keyUp":console.log.bind(console,"keyUp"),

        /**
         * @description 监听指定的按键输入（每个按键用 "," 分隔）
         * @param {Event} 
         */
        "arrowup,q,w,e_keyPress":console.log.bind(console,"keyPress"),
    })
```