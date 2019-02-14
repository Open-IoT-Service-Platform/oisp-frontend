/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2012 Ofer Reichman
 *
 * Portions Copyright (c) 2014 Intel Corporation
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 **/

exports.getType = function (obj) {
    switch (Object.prototype.toString.call(obj)) {
    case '[object String]':
        return 'string';
    case '[object Number]':
        return (obj % 1 === 0) ? 'integer' : 'number';
    case '[object Boolean]':
        return 'boolean';
    case '[object Object]':
        return 'object';
    case '[object Array]':
        return 'array';
    case '[object Null]':
        return 'null';
    default:
        return 'undefined';
    }
};

exports.prettyType = function (type) {
    switch (type) {
    case 'string':
    case 'number':
    case 'boolean':
        return 'a ' + type;
    case 'integer':
    case 'object':
    case 'array':
        return 'an ' + type;
    case 'null':
        return 'null';
    case 'any':
        return 'any type';
    case 'undefined':
        return 'undefined';
    default:
        if (typeof type === 'object') {
            return 'a schema';
        } else {
            return type;
        }
    }
};


exports.isOfType = function (obj, type) {
    switch (type) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'object':
    case 'array':
    case 'null':
        type = type.charAt(0).toUpperCase() + type.slice(1);
        return Object.prototype.toString.call(obj) === '[object ' + type + ']';
    case 'integer':
        return Object.prototype.toString.call(obj) === '[object Number]' && obj % 1 === 0;
    default:
        return true;
    }
};

exports.getName = function (names) {
    return names.length === 0 ? '' : ' property \'' + names.join('.') + '\'';
};

exports.deepEquals = function (obj1, obj2) {
    var p;

    if (Object.prototype.toString.call(obj1) !== Object.prototype.toString.call(obj2)) {
        return false;
    }

    switch (typeof obj1) {
    case 'object':
        if (obj1.toString() !== obj2.toString()) {
            return false;
        }
        for (p in obj1) {
            if (!(p in obj2)) {
                return false;
            }
            if (!exports.deepEquals(obj1[p], obj2[p])) {
                return false;
            }
        }
        for (p in obj2) {
            if (!(p in obj1)) {
                return false;
            }
        }
        return true;
    case 'function':
        return obj1[p].toString() === obj2[p].toString();
    default:
        return obj1 === obj2;
    }
};
