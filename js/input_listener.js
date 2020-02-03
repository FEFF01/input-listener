"use strict";

const CURSOR_PATTERN_MAP = {
    "rotate": /^rotate$/,
    "scale": /^scale$/,
    "dragMove2": /^dragMove2$/,
    "dragStart": /^dragStart$/,
    "dragMove": /^dragMove$/,
    "dragEnd": /^dragEnd$/,
    "unClick": /^unClick$/,
    "click": /^click$/,
}
const KEY_PATTERN_MAP = {
    "keyDown": /^\S+_keyDown$/,
    "keyUp": /^\S+_keyUp$/,
    "keyPress": /^\S+_keyPress$/,
}

class Base {
    static EVENT_CONFIG = {
        MOUSE_DOWN: ["mousedown", "cursorDown"],
        MOUSE_MOVE: ["mousemove", "cursorMove", window],
        MOUSE_UP: ["mouseup", "cursorUp", window],
        TOUCH_START: ["touchstart", "cursorDown"],
        TOUCH_MOVE: ["touchmove", "cursorMove", window],
        TOUCH_END: ["touchend", "cursorUp", window],
        TOUCH_CANCEL: ["touchcancel", "cursorUp", window],

        KEY_DOWN: ["keydown", "keyDown"],
        KEY_UP: ["keyup", "keyUp"],
        KEY_PRESS: ["keypress", "keyPress"],
    };
    static CURSOR_EVENT_HANDLES = Object.keys(CURSOR_PATTERN_MAP);
    static STATES = {
        IS_DRAG: 0b1,
        IS_ROTATE: 0b10,
        IS_SCALE: 0b100,

        MOUSE_DOWN: "MOUSE_DOWN",
        MOUSE_MOVE: "MOUSE_MOVE",
        MOUSE_UP: "MOUSE_UP",
        TOUCH_START: "TOUCH_START",
        TOUCH_MOVE: "TOUCH_MOVE",
        TOUCH_END: "TOUCH_END",
        TOUCH_CANCEL: "TOUCH_CANCEL",

        KEY_DOWN: "KEY_DOWN",
        KEY_UP: "KEY_UP",
        KEY_PRESS: "KEY_PRESS",
    };

    static PATTERN_MAP = {
        ...CURSOR_PATTERN_MAP,
        ...KEY_PATTERN_MAP
    };

    _activated_listener = {};
    _registered_listener = {
        rotate: null, scale: null,
        dragMove: null, dragStart: null, dragEnd: null, dragMove2: null,
        click: null, unClick: null,
        keyDown: { _parts: [], _reference: 0 }, keyUp: { _reference: 0 }, keyPress: { _reference: 0 }
    };
    _bm = 0x001;

    static MOUSE_EVENT_ID = -9007199254740991;

    static _PRIVATE_METHODS = {
        update_key_listener(storage, handle, callback, is_remove) {
            InputListener._PRIVATE_METHODS.match_keys(handle, key => {
                let callback_list = storage[key];
                callback_list || (callback_list = storage[key] = []);
                let index = callback_list.indexOf(callback);
                if (!is_remove) {
                    storage._reference++;
                    ~index || callback_list.push(callback);
                } else if (index >= 0) {
                    storage._reference--;
                    if (callback_list.length > 1) {
                        callback_list.splice(index, 1);
                    } else {
                        delete storage[key];
                    }
                }
            });
        },
        match_keys(str, callback) {
            //let keys = str.match(/(0x[0-9a-fA-F]+?|[0-9]+?)(?=0x|$|\||\,|\+|\_)/g) || [];
            let keys = str.match(/(\w+?|\ )(?=$|\||\,|\+)/g);
            keys = keys ? keys.map(key => key.toLocaleLowerCase()) : [];
            if (callback) {
                for (const key of keys) {
                    if (callback(key)) {
                        break;
                    }
                }
            } else {
                return keys;
            }

        },
        get_keys(e) {
            return (e.code && e.key !== e.code) ? [e.key.toLocaleLowerCase(), e.code.toLocaleLowerCase()] : [e.key.toLocaleLowerCase()];
        }
    }
    static _LISTENER_PREPROCESSOR = {
        keyDown(events, callback, is_remove) {
            function dec_ref(child) {
                var parent = child._parent;
                if (--child._reference <= 0 && parent) {
                    delete parent[child._key];
                    dec_ref(parent);
                }
            }
            let keygroups = events.slice(0, -8).split(","),
                nodes;
            let append_key = is_remove ? function (parent, key_code, is_last_child) {
                if (is_last_child) {
                    let child = parent[key_code];
                    if (child) {
                        let index = child._listeners.indexOf(callback);
                        if (index !== -1) {
                            child._listeners.splice(index, 1);
                            dec_ref(child);
                        }
                    }
                }
            } : function (parent, key_code, is_last_child) {
                let child = parent[key_code];
                if (!child) {
                    child = parent[key_code] = {
                        _parent: parent,
                        _key: key_code,
                        _reference: 0,
                        _parts: parent._parts.concat(key_code)
                    };
                    child._path = child._parts.join("+");
                    parent._reference++;
                }
                nodes.push(child);
                if (is_last_child) {
                    child._reference++;
                    child._listeners ? (child._listeners.indexOf(callback) === -1 && child._listeners.push(callback)) : child._listeners = [callback];
                }
            };
            /*解析相关的单键监听与组合键监听*/
            keygroups.forEach(function (keygroup) {
                nodes = [this._registered_listener.keyDown];
                keygroup.split("+").forEach(function (part, index, parts) {
                    let curr_nodes = nodes,
                        keys = InputListener._PRIVATE_METHODS.match_keys(part),//part.match(/(0x[0-9a-fA-F]+?|[0-9]+?)(?=0x|$|\|)/g)
                        is_last_child = parts.length === index + 1;
                    nodes = [];
                    for (const node of curr_nodes) {
                        for (const key of keys) {
                            append_key(node, key, is_last_child);
                        }
                    }
                }, this);
            }, this);
        },
        keyUp(handle, callback, is_remove) {
            InputListener._PRIVATE_METHODS.update_key_listener(this._registered_listener.keyUp, handle, callback, is_remove);
        },
        keyPress(handle, callback, is_remove) {
            InputListener._PRIVATE_METHODS.update_key_listener(this._registered_listener.keyPress, handle, callback, is_remove);
        }
    };
    target = null;
    _listener_options = undefined;
    constructor(target, options) {
        this.target = target;
        this._listener_options = options;
    }

    _listener_status = {};
    setListener(status) {
        for (const key in status) {
            if (!this._listener_status[key] != !status[key]) {
                const config = InputListener.EVENT_CONFIG[key];
                const event = config[0], handle = config[1];
                const target = config[2] || this.target;
                if (status[key]) {
                    target.addEventListener(event, this[handle], this._listener_options);
                } else {
                    target.removeEventListener(event, this[handle], this._listener_options);
                }
                this._listener_status[key] = !!status[key];
            }
        }
    }
    _points = [];
    _identifiers = [];
    eventDispenser(e, receiver) {
        if (this._identifiers[0] === InputListener.MOUSE_EVENT_ID) {
            if (2 ** e.button & this._bm) {
                receiver(e, e, 0);
            }
        } else if (e.changedTouches) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                let index = this._identifiers.indexOf(e.changedTouches[i].identifier);
                if (index !== -1) {
                    receiver(e, e.changedTouches[i], index);
                }
            }
        }
    }
    get _is_mouse_event() {
        return this._identifiers[0] === InputListener.MOUSE_EVENT_ID;
    }
}

class InputListener extends Base {
    _mesh_value = (window.devicePixelRatio || 1) * 4;
    _process_status = 0;
    _process_values = {
        kd_tasks: []
    };
    constructor(target, events, options) {
        super(target, options);
        this.registListener(events);
    }

    updateListener(events, is_remove) {
        let listener = this._registered_listener;
        const STATES = InputListener.STATES;
        if (events) {
            for (let name in events) {
                for (let handle in InputListener.PATTERN_MAP) {
                    if (InputListener.PATTERN_MAP[handle].test(name)) {
                        if (InputListener._LISTENER_PREPROCESSOR[handle]) {
                            events[name] &&
                                InputListener._LISTENER_PREPROCESSOR[handle].call(this, name, events[name], is_remove)
                        } else {
                            listener[handle] = is_remove ? null : events[name];
                        }
                    }
                }
            }
        }
        this._max_points = listener.scale || listener.rotate || listener.dragMove2 ? 2 : 1;

        let has_cursor = listener.dragStart || listener.dragMove || listener.dragMove2 || listener.dragEnd ||
            listener.click || listener.scale || listener.rotate ? true : false;
        this.setListener({
            [STATES.MOUSE_DOWN]: has_cursor,
            [STATES.TOUCH_START]: has_cursor,
            [STATES.KEY_DOWN]: listener.keyDown._reference > 0,
            [STATES.KEY_UP]: listener.keyDown._reference > 0 || listener.keyUp._reference > 0,
            [STATES.KEY_PRESS]: listener.keyPress._reference > 0
        });
    }
    _registPoint(e, t) {
        const STATES = InputListener.STATES;
        let points = this._points;
        let activated_listener = this._activated_listener;
        points.push({
            dx: t.clientX,
            dy: t.clientY,
            mx: t.clientX,
            my: t.clientY
        });
        this._identifiers.push(isNaN(t.identifier) ? InputListener.MOUSE_EVENT_ID : t.identifier);

        switch (points.length) {
            case 1:
                this._process_status = STATES.IS_DRAG;
                let is_mouse_event = this._is_mouse_event;
                this.setListener({
                    [STATES.MOUSE_DOWN]: is_mouse_event,
                    [STATES.MOUSE_MOVE]: is_mouse_event,
                    [STATES.MOUSE_UP]: is_mouse_event,
                    [STATES.TOUCH_MOVE]: !is_mouse_event,
                    [STATES.TOUCH_END]: !is_mouse_event,
                    [STATES.TOUCH_CANCEL]: !is_mouse_event,
                });
                break;
            case 2:
                this._process_values.sd = Math.sqrt((points[0].mx - points[1].mx) ** 2 + (points[0].my - points[1].my) ** 2);
                this._process_values.ra = Math.atan2(points[0].my - points[1].my, points[0].mx - points[1].mx);
                activated_listener.click && (activated_listener.click = false);
                if (activated_listener.unClick) {
                    activated_listener.unClick(e, t);
                    delete activated_listener.unClick;
                }
                break;
        }
    }
    cursorDown = (e) => {
        let t, points = this._points;
        if (this._identifiers[0] !== InputListener.MOUSE_EVENT_ID) {
            if (e.changedTouches && points.length < this._max_points) {
                for (const touche of e.changedTouches) {
                    if (this._identifiers.indexOf(touche.identifier) === -1) {
                        t = touche;
                        break;
                    }

                }
            } else if (points.length === 0 && 2 ** e.button & this._bm) {
                t = e;
            }
        }

        if (!t) {
            return;
        }

        let listener_count = InputListener.CURSOR_EVENT_HANDLES.length;
        if (points.length === 0) {
            let listeners = this._registered_listener;
            let mask = listeners.dragStart && listeners.dragStart(e, t) || false;
            if (mask === true) {
                return;
            }
            listener_count = 0
            InputListener.CURSOR_EVENT_HANDLES.reduce(
                (res, handle) => {
                    if (listeners[handle] && (mask === false || ~mask.indexOf(handle))) {
                        listener_count++;
                        res[handle] = listeners[handle];
                    } else {
                        delete res[handle];
                    }
                    return res;
                }, this._activated_listener
            )
        }
        if (listener_count > 1 || (listener_count > 0 && !activated_listener.dragStart)) {
            this._registPoint(e, t);
        }
    }
    _move = (e, t, index) => {
        let listener = this._activated_listener;
        let point = this._points[index];
        if (listener.dragMove) {
            var v2 = { x: t.clientX - point.mx, y: t.clientY - point.my };
            if (listener.dragMove(e, v2)) {
                point.mx = t.clientX - v2.x;
                point.my = t.clientY - v2.y;
            } else {
                point.mx = t.clientX;
                point.my = t.clientY;
            }
        }
        //如果存在点击监听，则在拖拽距离超出极限后去除监听并
        if (listener.click) {
            if (Math.abs(t.clientX - point.dx) + Math.abs(t.clientY - point.dy) > this._mesh_value) {
                listener.click = false;
                listener.unClick && listener.unClick(e, t);
            }
        }

    }
    _pinch = (e, t, index) => {
        const STATES = InputListener.STATES;
        let listener = this._activated_listener;
        let values = this._process_values;
        let points = this._points;
        let target_point = points[index];
        let sib_point = points[index === 1 ? 0 : 1];
        //target_point.mx = t.clientX, target_point.my = t.clientY;
        let ox = t.clientX - target_point.mx;
        let oy = t.clientY - target_point.my;
        if (listener.dragMove2) {
            let _v2 = { x: ox / 2, y: oy / 2 };
            if (listener.dragMove2(e, _v2)) {
                ox -= _v2.x * 2;
                oy -= _v2.y * 2;
            }
        }

        target_point.mx = target_point.mx + ox, target_point.my = target_point.my + oy;
        let cx = (target_point.mx + sib_point.mx) / 2, cy = (target_point.my + sib_point.my) / 2;
        if (listener.scale) {
            let _sd = Math.sqrt((target_point.mx - sib_point.mx) ** 2 + (target_point.my - sib_point.my) ** 2);
            if (this._process_status & STATES.IS_SCALE) {
                listener.scale(e, -(values.sd - (values.sd = _sd)));
            } else if (Math.abs(_sd - values.sd) > this._mesh_value) {
                this._process_status |= STATES.IS_SCALE;
                listener.scale(e,
                    -(values.sd - (values.sd = _sd)),
                    { x: cx, y: cy }
                );
            }
        }
        if (listener.rotate) {
            let reference_index = index === 0 ? 1 : index;
            let dx = points[0].mx - points[reference_index].mx;
            let dy = points[0].my - points[reference_index].my;
            let _ra = Math.atan2(dy, dx);
            _ra * values.ra <= 0 && (values.ra = - values.ra);
            if (this._process_status & STATES.IS_ROTATE) {
                listener.rotate(e, _ra - values.ra);
                values.ra = _ra;
            } else if (Math.abs(_ra - values.ra) > Math.PI * 0.01) {
                this._process_status |= STATES.IS_ROTATE;
                listener.rotate(e, _ra - values.ra, { x: cx, y: cy });
                values.ra = _ra;
            }
        }
    }
    cursorMove = (e) => {
        this.eventDispenser(e, this._points.length < 2 ? this._move : this._pinch);
    }
    _leave = (e, t, index) => {
        this._identifiers.splice(index, 1);
        this._points.splice(index, 1);
        const STATES = InputListener.STATES;
        let length = this._identifiers.length;
        let listener = this._activated_listener;
        switch (true) {
            case length < 1:
                this.setListener({
                    [STATES.MOUSE_DOWN]: true,
                    [STATES.MOUSE_MOVE]: false,
                    [STATES.MOUSE_UP]: false,
                    [STATES.TOUCH_MOVE]: false,
                    [STATES.TOUCH_END]: false,
                    [STATES.TOUCH_CANCEL]: false,
                });
                this._process_status = 0;
                listener.dragEnd && listener.dragEnd(e, t);
                listener.click && listener.click(e, t);
                break;
            case length < this._max_points:
                this._process_status = STATES.IS_DRAG;
                if (e.targetTouches && e.targetTouches.length >= this._max_points) {
                    for (const touche of e.targetTouches) {
                        if (this._identifiers.indexOf(touche.identifier) === -1) {
                            this._registPoint(e, touche);
                            break;
                        }
                    }
                }
                break;
        }
    }
    cursorUp = (e) => {
        this.eventDispenser(e, this._leave);
    }
    keyDown = (e) => {
        let kd_tasks = this._process_values.kd_tasks;
        function dispose_task(task) {
            if (task) {
                let cl_count = task._listeners ? task._listeners.length : 0;
                for (let i = 0; i < cl_count; i++) {
                    if (task._listeners[i](e, task._path) === true) {
                        return true;
                    }
                }
                task._reference > cl_count && kd_tasks.indexOf(task) === -1 && kd_tasks.push(task);
            }
        }
        let keys = InputListener._PRIVATE_METHODS.get_keys(e);
        if (!kd_tasks.some(task => keys.some(key => dispose_task(task[key])))) {
            for (const key of keys) {
                if (dispose_task(this._registered_listener.keyDown[key])) {
                    break;
                }
            }
        }
    }
    keyUp = (e) => {
        let keys = InputListener._PRIVATE_METHODS.get_keys(e);
        let kd_tasks = this._process_values.kd_tasks;
        for (let i = 0; i < kd_tasks.length; i++) {
            if (keys.some(key => kd_tasks[i]._parts.indexOf(key) !== -1)) {
                kd_tasks.splice(i--, 1);
            }
        }
        /*处理keyUp定义的监听*/
        let listener = this._registered_listener.keyUp;
        for (const key of keys) {
            listener[key] && listener[key].some(task => task(e));
        }
    }
    keyPress = (e) => {
        let keys = InputListener._PRIVATE_METHODS.get_keys(e);
        let listener = this._registered_listener.keyPress;
        for (const key of keys) {
            listener[key] && listener[key].some(task => task(e));
        }
    }
    registListener(events) {
        this.updateListener(events);
    }
    removeListener(events) {
        if (events) {
            this.updateListener(events, true);
        } else {
            //...
        }
    }
    stopListener() {
        this.setListener(Object.keys(this._listener_status).reduce((res, key) => {
            this._listener_status[key] && (res[key] = false);
            return res;
        }, {}));
    }
}

try {
    window.InputListener = InputListener;
} catch (e) {
}
export default InputListener;
