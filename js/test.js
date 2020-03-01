
const InputListener =require('./input_listener.js');
//import InputListener from './input_listener.js'
//import InputListener from '../dist/js/input_listener.js'
//const InputListener =require('../dist/js/input_listener.js');

console.log(InputListener);
/*
document.body.addEventListener(
    "touchstart",
    e => { e.touches.length > 1 && e.preventDefault() },
    { passive: false });*/
init_testview(test_view1);
init_testview(test_view2);
var z_index = 0;
function init_testview(view) {
    let rotate = 0;
    let scale = 1;
    let tx = 0, ty = 0;
    let _af;
    let text_view = view.querySelector("#text_view");
    function move(e, v2) {
        tx += v2[0];
        ty += v2[1];
        requestRender();
    }
    function requestRender() {
        _af || (_af = window.requestAnimationFrame(translate));
    }
    function translate() {
        _af = null;
        view.style.transform = `translate(${tx}px,${ty}px) rotate(${rotate}deg) scale(${scale})`;
    }

    function append_textfield(text) {
        let textfield = document.createElement("li");
        textfield.style.cssText = "display:block;width:100%;";
        textfield.innerHTML = text;
        text_view.firstChild ? text_view.insertBefore(textfield, text_view.firstChild) : text_view.appendChild(textfield);
    }
    let inputListener = new InputListener(view, {
        dragStart: (e) => {
            e.preventDefault();
            view.style.boxShadow = "0 0 4px black";
            view.style.zIndex = ++z_index;
            view.focus();
        },
        dragEnd: (e) => {
            view.style.boxShadow = "";
        },
        dragMove: move,
        dragMove2: move,
        pinch: (e, s, center_point) => {
            center_point && console.log("pinch", center_point);
            scale = scale * (1 + s / (view.clientWidth * scale));
            requestRender();
        },
        rotate: (e, r, center_point) => {
            center_point && console.log("rotate", center_point);
            rotate += r * 180 / Math.PI;
            requestRender();
        },
        click: (e) => {
            e.preventDefault();
            console.log("click->", e);
        },
        "alt|ArrowUp+a,arrowup+a|z+s|x+d|c,s,d+f,f,d_keyDown": (e, p) => {
            text_view && append_textfield(`keyDown:${p}`);
            console.log("keyDown", e, p);
            //return true;
        },
        "s,1,f_keyUp": e => {
            text_view && append_textfield(`keyUp:${e.code || e.key}`);
            console.log("keyUp", e);
        },//console.log.bind(console, "keyUp"),
        "s,d,e_keyPress": e => {
            text_view && append_textfield(`keyPress:${e.code || e.key}`);
            console.log("keyPress", e);
        },
        "1,2,3,4,5,6_keyPress": e => {
            text_view && append_textfield(`keyPress:${e.code}`);
            console.log("keyPress", e);
        },
    })
    console.log(inputListener);
}

