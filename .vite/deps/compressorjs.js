import "./chunk-LK32TJAX.js";

// node_modules/compressorjs/dist/compressor.esm.js
function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);
  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function(sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys.push.apply(keys, symbols);
  }
  return keys;
}
function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = null != arguments[i] ? arguments[i] : {};
    i % 2 ? ownKeys(Object(source), true).forEach(function(key) {
      _defineProperty(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function(key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }
  return target;
}
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
  }
}
function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  Object.defineProperty(Constructor, "prototype", {
    writable: false
  });
  return Constructor;
}
function _defineProperty(obj, key, value) {
  key = _toPropertyKey(key);
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
function _toPrimitive(input, hint) {
  if (typeof input !== "object" || input === null) return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== void 0) {
    var res = prim.call(input, hint || "default");
    if (typeof res !== "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}
function _toPropertyKey(arg) {
  var key = _toPrimitive(arg, "string");
  return typeof key === "symbol" ? key : String(key);
}
var canvasToBlob = { exports: {} };
(function(module) {
  if (typeof window === "undefined") {
    return;
  }
  (function(window2) {
    var CanvasPrototype = window2.HTMLCanvasElement && window2.HTMLCanvasElement.prototype;
    var hasBlobConstructor = window2.Blob && function() {
      try {
        return Boolean(new Blob());
      } catch (e) {
        return false;
      }
    }();
    var hasArrayBufferViewSupport = hasBlobConstructor && window2.Uint8Array && function() {
      try {
        return new Blob([new Uint8Array(100)]).size === 100;
      } catch (e) {
        return false;
      }
    }();
    var BlobBuilder = window2.BlobBuilder || window2.WebKitBlobBuilder || window2.MozBlobBuilder || window2.MSBlobBuilder;
    var dataURIPattern = /^data:((.*?)(;charset=.*?)?)(;base64)?,/;
    var dataURLtoBlob = (hasBlobConstructor || BlobBuilder) && window2.atob && window2.ArrayBuffer && window2.Uint8Array && function(dataURI) {
      var matches, mediaType, isBase64, dataString, byteString, arrayBuffer, intArray, i, bb;
      matches = dataURI.match(dataURIPattern);
      if (!matches) {
        throw new Error("invalid data URI");
      }
      mediaType = matches[2] ? matches[1] : "text/plain" + (matches[3] || ";charset=US-ASCII");
      isBase64 = !!matches[4];
      dataString = dataURI.slice(matches[0].length);
      if (isBase64) {
        byteString = atob(dataString);
      } else {
        byteString = decodeURIComponent(dataString);
      }
      arrayBuffer = new ArrayBuffer(byteString.length);
      intArray = new Uint8Array(arrayBuffer);
      for (i = 0; i < byteString.length; i += 1) {
        intArray[i] = byteString.charCodeAt(i);
      }
      if (hasBlobConstructor) {
        return new Blob([hasArrayBufferViewSupport ? intArray : arrayBuffer], {
          type: mediaType
        });
      }
      bb = new BlobBuilder();
      bb.append(arrayBuffer);
      return bb.getBlob(mediaType);
    };
    if (window2.HTMLCanvasElement && !CanvasPrototype.toBlob) {
      if (CanvasPrototype.mozGetAsFile) {
        CanvasPrototype.toBlob = function(callback, type, quality) {
          var self = this;
          setTimeout(function() {
            if (quality && CanvasPrototype.toDataURL && dataURLtoBlob) {
              callback(dataURLtoBlob(self.toDataURL(type, quality)));
            } else {
              callback(self.mozGetAsFile("blob", type));
            }
          });
        };
      } else if (CanvasPrototype.toDataURL && dataURLtoBlob) {
        if (CanvasPrototype.msToBlob) {
          CanvasPrototype.toBlob = function(callback, type, quality) {
            var self = this;
            setTimeout(function() {
              if ((type && type !== "image/png" || quality) && CanvasPrototype.toDataURL && dataURLtoBlob) {
                callback(dataURLtoBlob(self.toDataURL(type, quality)));
              } else {
                callback(self.msToBlob(type));
              }
            });
          };
        } else {
          CanvasPrototype.toBlob = function(callback, type, quality) {
            var self = this;
            setTimeout(function() {
              callback(dataURLtoBlob(self.toDataURL(type, quality)));
            });
          };
        }
      }
    }
    if (module.exports) {
      module.exports = dataURLtoBlob;
    } else {
      window2.dataURLtoBlob = dataURLtoBlob;
    }
  })(window);
})(canvasToBlob);
var toBlob = canvasToBlob.exports;
var isBlob = function isBlob2(value) {
  if (typeof Blob === "undefined") {
    return false;
  }
  return value instanceof Blob || Object.prototype.toString.call(value) === "[object Blob]";
};
var DEFAULTS = {
  /**
   * Indicates if output the original image instead of the compressed one
   * when the size of the compressed image is greater than the original one's
   * @type {boolean}
   */
  strict: true,
  /**
   * Indicates if read the image's Exif Orientation information,
   * and then rotate or flip the image automatically.
   * @type {boolean}
   */
  checkOrientation: true,
  /**
   * Indicates if retain the image's Exif information after compressed.
   * @type {boolean}
  */
  retainExif: false,
  /**
   * The max width of the output image.
   * @type {number}
   */
  maxWidth: Infinity,
  /**
   * The max height of the output image.
   * @type {number}
   */
  maxHeight: Infinity,
  /**
   * The min width of the output image.
   * @type {number}
   */
  minWidth: 0,
  /**
   * The min height of the output image.
   * @type {number}
   */
  minHeight: 0,
  /**
   * The width of the output image.
   * If not specified, the natural width of the source image will be used.
   * @type {number}
   */
  width: void 0,
  /**
   * The height of the output image.
   * If not specified, the natural height of the source image will be used.
   * @type {number}
   */
  height: void 0,
  /**
   * Sets how the size of the image should be resized to the container
   * specified by the `width` and `height` options.
   * @type {string}
   */
  resize: "none",
  /**
   * The quality of the output image.
   * It must be a number between `0` and `1`,
   * and only available for `image/jpeg` and `image/webp` images.
   * Check out {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob canvas.toBlob}.
   * @type {number}
   */
  quality: 0.8,
  /**
   * The mime type of the output image.
   * By default, the original mime type of the source image file will be used.
   * @type {string}
   */
  mimeType: "auto",
  /**
   * Files whose file type is included in this list,
   * and whose file size exceeds the `convertSize` value will be converted to JPEGs.
   * @type {string｜Array}
   */
  convertTypes: ["image/png"],
  /**
   * PNG files over this size (5 MB by default) will be converted to JPEGs.
   * To disable this, just set the value to `Infinity`.
   * @type {number}
   */
  convertSize: 5e6,
  /**
   * The hook function to execute before draw the image into the canvas for compression.
   * @type {Function}
   * @param {CanvasRenderingContext2D} context - The 2d rendering context of the canvas.
   * @param {HTMLCanvasElement} canvas - The canvas for compression.
   * @example
   * function (context, canvas) {
   *   context.fillStyle = '#fff';
   * }
   */
  beforeDraw: null,
  /**
   * The hook function to execute after drew the image into the canvas for compression.
   * @type {Function}
   * @param {CanvasRenderingContext2D} context - The 2d rendering context of the canvas.
   * @param {HTMLCanvasElement} canvas - The canvas for compression.
   * @example
   * function (context, canvas) {
   *   context.filter = 'grayscale(100%)';
   * }
   */
  drew: null,
  /**
   * The hook function to execute when success to compress the image.
   * @type {Function}
   * @param {File} file - The compressed image File object.
   * @example
   * function (file) {
   *   console.log(file);
   * }
   */
  success: null,
  /**
   * The hook function to execute when fail to compress the image.
   * @type {Function}
   * @param {Error} err - An Error object.
   * @example
   * function (err) {
   *   console.log(err.message);
   * }
   */
  error: null
};
var IS_BROWSER = typeof window !== "undefined" && typeof window.document !== "undefined";
var WINDOW = IS_BROWSER ? window : {};
var isPositiveNumber = function isPositiveNumber2(value) {
  return value > 0 && value < Infinity;
};
var slice = Array.prototype.slice;
function toArray(value) {
  return Array.from ? Array.from(value) : slice.call(value);
}
var REGEXP_IMAGE_TYPE = /^image\/.+$/;
function isImageType(value) {
  return REGEXP_IMAGE_TYPE.test(value);
}
function imageTypeToExtension(value) {
  var extension = isImageType(value) ? value.substr(6) : "";
  if (extension === "jpeg") {
    extension = "jpg";
  }
  return ".".concat(extension);
}
var fromCharCode = String.fromCharCode;
function getStringFromCharCode(dataView, start, length) {
  var str = "";
  var i;
  length += start;
  for (i = start; i < length; i += 1) {
    str += fromCharCode(dataView.getUint8(i));
  }
  return str;
}
var btoa = WINDOW.btoa;
function arrayBufferToDataURL(arrayBuffer, mimeType) {
  var chunks = [];
  var chunkSize = 8192;
  var uint8 = new Uint8Array(arrayBuffer);
  while (uint8.length > 0) {
    chunks.push(fromCharCode.apply(null, toArray(uint8.subarray(0, chunkSize))));
    uint8 = uint8.subarray(chunkSize);
  }
  return "data:".concat(mimeType, ";base64,").concat(btoa(chunks.join("")));
}
function resetAndGetOrientation(arrayBuffer) {
  var dataView = new DataView(arrayBuffer);
  var orientation;
  try {
    var littleEndian;
    var app1Start;
    var ifdStart;
    if (dataView.getUint8(0) === 255 && dataView.getUint8(1) === 216) {
      var length = dataView.byteLength;
      var offset = 2;
      while (offset + 1 < length) {
        if (dataView.getUint8(offset) === 255 && dataView.getUint8(offset + 1) === 225) {
          app1Start = offset;
          break;
        }
        offset += 1;
      }
    }
    if (app1Start) {
      var exifIDCode = app1Start + 4;
      var tiffOffset = app1Start + 10;
      if (getStringFromCharCode(dataView, exifIDCode, 4) === "Exif") {
        var endianness = dataView.getUint16(tiffOffset);
        littleEndian = endianness === 18761;
        if (littleEndian || endianness === 19789) {
          if (dataView.getUint16(tiffOffset + 2, littleEndian) === 42) {
            var firstIFDOffset = dataView.getUint32(tiffOffset + 4, littleEndian);
            if (firstIFDOffset >= 8) {
              ifdStart = tiffOffset + firstIFDOffset;
            }
          }
        }
      }
    }
    if (ifdStart) {
      var _length = dataView.getUint16(ifdStart, littleEndian);
      var _offset;
      var i;
      for (i = 0; i < _length; i += 1) {
        _offset = ifdStart + i * 12 + 2;
        if (dataView.getUint16(_offset, littleEndian) === 274) {
          _offset += 8;
          orientation = dataView.getUint16(_offset, littleEndian);
          dataView.setUint16(_offset, 1, littleEndian);
          break;
        }
      }
    }
  } catch (e) {
    orientation = 1;
  }
  return orientation;
}
function parseOrientation(orientation) {
  var rotate = 0;
  var scaleX = 1;
  var scaleY = 1;
  switch (orientation) {
    case 2:
      scaleX = -1;
      break;
    case 3:
      rotate = -180;
      break;
    case 4:
      scaleY = -1;
      break;
    case 5:
      rotate = 90;
      scaleY = -1;
      break;
    case 6:
      rotate = 90;
      break;
    case 7:
      rotate = 90;
      scaleX = -1;
      break;
    case 8:
      rotate = -90;
      break;
  }
  return {
    rotate,
    scaleX,
    scaleY
  };
}
var REGEXP_DECIMALS = /\.\d*(?:0|9){12}\d*$/;
function normalizeDecimalNumber(value) {
  var times = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 1e11;
  return REGEXP_DECIMALS.test(value) ? Math.round(value * times) / times : value;
}
function getAdjustedSizes(_ref) {
  var aspectRatio = _ref.aspectRatio, height = _ref.height, width = _ref.width;
  var type = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "none";
  var isValidWidth = isPositiveNumber(width);
  var isValidHeight = isPositiveNumber(height);
  if (isValidWidth && isValidHeight) {
    var adjustedWidth = height * aspectRatio;
    if ((type === "contain" || type === "none") && adjustedWidth > width || type === "cover" && adjustedWidth < width) {
      height = width / aspectRatio;
    } else {
      width = height * aspectRatio;
    }
  } else if (isValidWidth) {
    height = width / aspectRatio;
  } else if (isValidHeight) {
    width = height * aspectRatio;
  }
  return {
    width,
    height
  };
}
function getExif(arrayBuffer) {
  var array = toArray(new Uint8Array(arrayBuffer));
  var length = array.length;
  var segments = [];
  var start = 0;
  while (start + 3 < length) {
    var value = array[start];
    var next = array[start + 1];
    if (value === 255 && next === 218) {
      break;
    }
    if (value === 255 && next === 216) {
      start += 2;
    } else {
      var offset = array[start + 2] * 256 + array[start + 3];
      var end = start + offset + 2;
      var segment = array.slice(start, end);
      segments.push(segment);
      start = end;
    }
  }
  return segments.reduce(function(exifArray, current) {
    if (current[0] === 255 && current[1] === 225) {
      return exifArray.concat(current);
    }
    return exifArray;
  }, []);
}
function insertExif(arrayBuffer, exifArray) {
  var array = toArray(new Uint8Array(arrayBuffer));
  if (array[2] !== 255 || array[3] !== 224) {
    return arrayBuffer;
  }
  var app0Length = array[4] * 256 + array[5];
  var newArrayBuffer = [255, 216].concat(exifArray, array.slice(4 + app0Length));
  return new Uint8Array(newArrayBuffer);
}
var ArrayBuffer$1 = WINDOW.ArrayBuffer;
var FileReader = WINDOW.FileReader;
var URL = WINDOW.URL || WINDOW.webkitURL;
var REGEXP_EXTENSION = /\.\w+$/;
var AnotherCompressor = WINDOW.Compressor;
var Compressor = function() {
  function Compressor2(file, options) {
    _classCallCheck(this, Compressor2);
    this.file = file;
    this.exif = [];
    this.image = new Image();
    this.options = _objectSpread2(_objectSpread2({}, DEFAULTS), options);
    this.aborted = false;
    this.result = null;
    this.init();
  }
  _createClass(Compressor2, [{
    key: "init",
    value: function init() {
      var _this = this;
      var file = this.file, options = this.options;
      if (!isBlob(file)) {
        this.fail(new Error("The first argument must be a File or Blob object."));
        return;
      }
      var mimeType = file.type;
      if (!isImageType(mimeType)) {
        this.fail(new Error("The first argument must be an image File or Blob object."));
        return;
      }
      if (!URL || !FileReader) {
        this.fail(new Error("The current browser does not support image compression."));
        return;
      }
      if (!ArrayBuffer$1) {
        options.checkOrientation = false;
        options.retainExif = false;
      }
      var isJPEGImage = mimeType === "image/jpeg";
      var checkOrientation = isJPEGImage && options.checkOrientation;
      var retainExif = isJPEGImage && options.retainExif;
      if (URL && !checkOrientation && !retainExif) {
        this.load({
          url: URL.createObjectURL(file)
        });
      } else {
        var reader = new FileReader();
        this.reader = reader;
        reader.onload = function(_ref) {
          var target = _ref.target;
          var result = target.result;
          var data = {};
          var orientation = 1;
          if (checkOrientation) {
            orientation = resetAndGetOrientation(result);
            if (orientation > 1) {
              _extends(data, parseOrientation(orientation));
            }
          }
          if (retainExif) {
            _this.exif = getExif(result);
          }
          if (checkOrientation || retainExif) {
            if (!URL || orientation > 1) {
              data.url = arrayBufferToDataURL(result, mimeType);
            } else {
              data.url = URL.createObjectURL(file);
            }
          } else {
            data.url = result;
          }
          _this.load(data);
        };
        reader.onabort = function() {
          _this.fail(new Error("Aborted to read the image with FileReader."));
        };
        reader.onerror = function() {
          _this.fail(new Error("Failed to read the image with FileReader."));
        };
        reader.onloadend = function() {
          _this.reader = null;
        };
        if (checkOrientation || retainExif) {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsDataURL(file);
        }
      }
    }
  }, {
    key: "load",
    value: function load(data) {
      var _this2 = this;
      var file = this.file, image = this.image;
      image.onload = function() {
        _this2.draw(_objectSpread2(_objectSpread2({}, data), {}, {
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight
        }));
      };
      image.onabort = function() {
        _this2.fail(new Error("Aborted to load the image."));
      };
      image.onerror = function() {
        _this2.fail(new Error("Failed to load the image."));
      };
      if (WINDOW.navigator && /(?:iPad|iPhone|iPod).*?AppleWebKit/i.test(WINDOW.navigator.userAgent)) {
        image.crossOrigin = "anonymous";
      }
      image.alt = file.name;
      image.src = data.url;
    }
  }, {
    key: "draw",
    value: function draw(_ref2) {
      var _this3 = this;
      var naturalWidth = _ref2.naturalWidth, naturalHeight = _ref2.naturalHeight, _ref2$rotate = _ref2.rotate, rotate = _ref2$rotate === void 0 ? 0 : _ref2$rotate, _ref2$scaleX = _ref2.scaleX, scaleX = _ref2$scaleX === void 0 ? 1 : _ref2$scaleX, _ref2$scaleY = _ref2.scaleY, scaleY = _ref2$scaleY === void 0 ? 1 : _ref2$scaleY;
      var file = this.file, image = this.image, options = this.options;
      var canvas = document.createElement("canvas");
      var context = canvas.getContext("2d");
      var is90DegreesRotated = Math.abs(rotate) % 180 === 90;
      var resizable = (options.resize === "contain" || options.resize === "cover") && isPositiveNumber(options.width) && isPositiveNumber(options.height);
      var maxWidth = Math.max(options.maxWidth, 0) || Infinity;
      var maxHeight = Math.max(options.maxHeight, 0) || Infinity;
      var minWidth = Math.max(options.minWidth, 0) || 0;
      var minHeight = Math.max(options.minHeight, 0) || 0;
      var aspectRatio = naturalWidth / naturalHeight;
      var width = options.width, height = options.height;
      if (is90DegreesRotated) {
        var _ref3 = [maxHeight, maxWidth];
        maxWidth = _ref3[0];
        maxHeight = _ref3[1];
        var _ref4 = [minHeight, minWidth];
        minWidth = _ref4[0];
        minHeight = _ref4[1];
        var _ref5 = [height, width];
        width = _ref5[0];
        height = _ref5[1];
      }
      if (resizable) {
        aspectRatio = width / height;
      }
      var _getAdjustedSizes = getAdjustedSizes({
        aspectRatio,
        width: maxWidth,
        height: maxHeight
      }, "contain");
      maxWidth = _getAdjustedSizes.width;
      maxHeight = _getAdjustedSizes.height;
      var _getAdjustedSizes2 = getAdjustedSizes({
        aspectRatio,
        width: minWidth,
        height: minHeight
      }, "cover");
      minWidth = _getAdjustedSizes2.width;
      minHeight = _getAdjustedSizes2.height;
      if (resizable) {
        var _getAdjustedSizes3 = getAdjustedSizes({
          aspectRatio,
          width,
          height
        }, options.resize);
        width = _getAdjustedSizes3.width;
        height = _getAdjustedSizes3.height;
      } else {
        var _getAdjustedSizes4 = getAdjustedSizes({
          aspectRatio,
          width,
          height
        });
        var _getAdjustedSizes4$wi = _getAdjustedSizes4.width;
        width = _getAdjustedSizes4$wi === void 0 ? naturalWidth : _getAdjustedSizes4$wi;
        var _getAdjustedSizes4$he = _getAdjustedSizes4.height;
        height = _getAdjustedSizes4$he === void 0 ? naturalHeight : _getAdjustedSizes4$he;
      }
      width = Math.floor(normalizeDecimalNumber(Math.min(Math.max(width, minWidth), maxWidth)));
      height = Math.floor(normalizeDecimalNumber(Math.min(Math.max(height, minHeight), maxHeight)));
      var destX = -width / 2;
      var destY = -height / 2;
      var destWidth = width;
      var destHeight = height;
      var params = [];
      if (resizable) {
        var srcX = 0;
        var srcY = 0;
        var srcWidth = naturalWidth;
        var srcHeight = naturalHeight;
        var _getAdjustedSizes5 = getAdjustedSizes({
          aspectRatio,
          width: naturalWidth,
          height: naturalHeight
        }, {
          contain: "cover",
          cover: "contain"
        }[options.resize]);
        srcWidth = _getAdjustedSizes5.width;
        srcHeight = _getAdjustedSizes5.height;
        srcX = (naturalWidth - srcWidth) / 2;
        srcY = (naturalHeight - srcHeight) / 2;
        params.push(srcX, srcY, srcWidth, srcHeight);
      }
      params.push(destX, destY, destWidth, destHeight);
      if (is90DegreesRotated) {
        var _ref6 = [height, width];
        width = _ref6[0];
        height = _ref6[1];
      }
      canvas.width = width;
      canvas.height = height;
      if (!isImageType(options.mimeType)) {
        options.mimeType = file.type;
      }
      var fillStyle = "transparent";
      if (file.size > options.convertSize && options.convertTypes.indexOf(options.mimeType) >= 0) {
        options.mimeType = "image/jpeg";
      }
      var isJPEGImage = options.mimeType === "image/jpeg";
      if (isJPEGImage) {
        fillStyle = "#fff";
      }
      context.fillStyle = fillStyle;
      context.fillRect(0, 0, width, height);
      if (options.beforeDraw) {
        options.beforeDraw.call(this, context, canvas);
      }
      if (this.aborted) {
        return;
      }
      context.save();
      context.translate(width / 2, height / 2);
      context.rotate(rotate * Math.PI / 180);
      context.scale(scaleX, scaleY);
      context.drawImage.apply(context, [image].concat(params));
      context.restore();
      if (options.drew) {
        options.drew.call(this, context, canvas);
      }
      if (this.aborted) {
        return;
      }
      var callback = function callback2(blob) {
        if (!_this3.aborted) {
          var done = function done2(result) {
            return _this3.done({
              naturalWidth,
              naturalHeight,
              result
            });
          };
          if (blob && isJPEGImage && options.retainExif && _this3.exif && _this3.exif.length > 0) {
            var next = function next2(arrayBuffer) {
              return done(toBlob(arrayBufferToDataURL(insertExif(arrayBuffer, _this3.exif), options.mimeType)));
            };
            if (blob.arrayBuffer) {
              blob.arrayBuffer().then(next).catch(function() {
                _this3.fail(new Error("Failed to read the compressed image with Blob.arrayBuffer()."));
              });
            } else {
              var reader = new FileReader();
              _this3.reader = reader;
              reader.onload = function(_ref7) {
                var target = _ref7.target;
                next(target.result);
              };
              reader.onabort = function() {
                _this3.fail(new Error("Aborted to read the compressed image with FileReader."));
              };
              reader.onerror = function() {
                _this3.fail(new Error("Failed to read the compressed image with FileReader."));
              };
              reader.onloadend = function() {
                _this3.reader = null;
              };
              reader.readAsArrayBuffer(blob);
            }
          } else {
            done(blob);
          }
        }
      };
      if (canvas.toBlob) {
        canvas.toBlob(callback, options.mimeType, options.quality);
      } else {
        callback(toBlob(canvas.toDataURL(options.mimeType, options.quality)));
      }
    }
  }, {
    key: "done",
    value: function done(_ref8) {
      var naturalWidth = _ref8.naturalWidth, naturalHeight = _ref8.naturalHeight, result = _ref8.result;
      var file = this.file, image = this.image, options = this.options;
      if (URL && image.src.indexOf("blob:") === 0) {
        URL.revokeObjectURL(image.src);
      }
      if (result) {
        if (options.strict && !options.retainExif && result.size > file.size && options.mimeType === file.type && !(options.width > naturalWidth || options.height > naturalHeight || options.minWidth > naturalWidth || options.minHeight > naturalHeight || options.maxWidth < naturalWidth || options.maxHeight < naturalHeight)) {
          result = file;
        } else {
          var date = /* @__PURE__ */ new Date();
          result.lastModified = date.getTime();
          result.lastModifiedDate = date;
          result.name = file.name;
          if (result.name && result.type !== file.type) {
            result.name = result.name.replace(REGEXP_EXTENSION, imageTypeToExtension(result.type));
          }
        }
      } else {
        result = file;
      }
      this.result = result;
      if (options.success) {
        options.success.call(this, result);
      }
    }
  }, {
    key: "fail",
    value: function fail(err) {
      var options = this.options;
      if (options.error) {
        options.error.call(this, err);
      } else {
        throw err;
      }
    }
  }, {
    key: "abort",
    value: function abort() {
      if (!this.aborted) {
        this.aborted = true;
        if (this.reader) {
          this.reader.abort();
        } else if (!this.image.complete) {
          this.image.onload = null;
          this.image.onabort();
        } else {
          this.fail(new Error("The compression process has been aborted."));
        }
      }
    }
    /**
     * Get the no conflict compressor class.
     * @returns {Compressor} The compressor class.
     */
  }], [{
    key: "noConflict",
    value: function noConflict() {
      window.Compressor = AnotherCompressor;
      return Compressor2;
    }
    /**
     * Change the default options.
     * @param {Object} options - The new default options.
     */
  }, {
    key: "setDefaults",
    value: function setDefaults(options) {
      _extends(DEFAULTS, options);
    }
  }]);
  return Compressor2;
}();
export {
  Compressor as default
};
/*! Bundled license information:

compressorjs/dist/compressor.esm.js:
  (*!
   * Compressor.js v1.2.1
   * https://fengyuanchen.github.io/compressorjs
   *
   * Copyright 2018-present Chen Fengyuan
   * Released under the MIT license
   *
   * Date: 2023-02-28T14:09:41.732Z
   *)
*/
//# sourceMappingURL=compressorjs.js.map
