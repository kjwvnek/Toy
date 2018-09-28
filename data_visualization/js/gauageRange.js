function GauageRange(options) {
    this.gauageColor = null;
    this.rangeId = GauageRange.rangeId++;
    this.indicators = options.indicators || [];
    this.gradient = options.gradient || [];
    this.size = {
        total: options.size.radius,
        radius: options.size.radius - options.size.gauage - options.size.indicator / 2,
        indicator: options.size.indicator,
        gauage: options.size.gauage
    };
    this.rangeLength = options.indicators.length + 1;
    this.angleUnit = Math.PI / this.rangeLength;
    this.side = options.side;
    this.format = options.format;
    
    if (this.side === 'left') {
        this.startAngle = Math.PI;
        this.endAngle = Math.PI * 2;
    } else {
        this.startAngle = 0;
        this.endAngle = Math.PI;
    }
    
    // calculate gradient colors
    this.gradient = GauageRange.util.color.unifyColorFormat(this.gradient, 'rgb');
    
    for (var i = 1; i < this.gradient.length - 1; i++) {
        if (this.gradient[i] !== null) continue;
        
        var prevColor = this.gradient[i - 1];
        var rate, nextColor;
        
        for (var j = i + 1; j < this.gradient.length - 1; j++) {
            if (this.gradient[j] !== null) {
                nextColor = this.gradient[j];
                rate = 1 / (j - i + 1);
                break;
            }
        }
        
        this.gradient[i] = GauageRange.util.color.getGradientPoint(prevColor, nextColor, rate);
    }
}
GauageRange.prototype.render = function(svg, value) {
    var initPercent = this.format ? this.format(value) : value;
    initPercent = initPercent < 0 ? 0 : initPercent >= 100 ? 99 : initPercent;

    var defsElement = GauageRange.util.svg.createElement({ tagName: 'defs' });
    var shadowElement = GauageRange.util.svg.createInnerShadowElement('chart-panel-shadow-' + this.rangeId, 0, 0, 4, 'black', 0.4);
    var indicatorGroupElement = GauageRange.util.svg.createElement({
        tagName: 'g',
        attrs: {
            'transform': this.side === 'left'
                ? 'translate(' + this.size.total + ',' + this.size.total + ')'
                : 'translate(0,' + this.size.total + ')'
        }
    });
    var gauageGroupElement = GauageRange.util.svg.createElement({
        tagName: 'g',
        attrs: {
            'transform': this.side === 'left'
                ? 'translate(' + this.size.total + ',0)'
                : 'translate(0,0)'
        }
    });
    
    // init element
    defsElement.appendChild(shadowElement);
    svg.appendChild(defsElement);
    svg.appendChild(gauageGroupElement);
    svg.appendChild(indicatorGroupElement);
    
    this.element = {
        svg: svg,
        defs: defsElement,
        indicatorGroup: indicatorGroupElement,
        gauageGroup: gauageGroupElement
    };
    
    this.renderIndicator();
    this.renderGauage(initPercent);
    this.renderPanel(initPercent);
};
GauageRange.prototype.renderIndicator = function() {
    var self = this;
    
    this.indicators.forEach(function(indicator, i) {
        var indicatorElement = null;
        var dx, dy;
        var angle = (i + 1) * self.angleUnit + self.startAngle,
            radianX = Math.sin(angle),
            radianY = Math.cos(angle);
        
        if (self.side === 'left') {
            if (indicator !== null) {
                dx = [0, 0, -2, -2, -3, -1, 0, 0, 0];
                dy = [4, 4, 4, 3, 0, 0, 1, 1, 3];
                indicatorElement = GauageRange.util.svg.createElement({
                    tagName: 'text',
                    text: indicator,
                    attrs: {
                        'x': self.size.radius * radianX,
                        'y': -(self.size.radius * radianY),
                        'dx': dx[i],
                        'dy': dy[i],
                        'style': 'font-size:8px;fill:#616161'
                    }
                });
            }
        } else {
            if (indicator === null) {
                indicatorElement = GauageRange.util.svg.createElement({
                    tagName: 'line',
                    attrs: {
                        'x1': (self.size.radius - 5) * radianX,
                        'y1': -((self.size.radius - 5) * radianY),
                        'x2': (self.size.radius + 5) * radianX,
                        'y2': -((self.size.radius + 5) * radianY),
                        'stroke': '#D6D6D6'
                    }
                });
            } else {
                dy = [1, 1, 1, 1, 1, 1, 5, 5, 5, 5, 5];
                indicatorElement = GauageRange.util.svg.createElement({
                    tagName: 'text',
                    text: indicator,
                    attrs: {
                        'x': (self.size.radius - 5) * radianX,
                        'y': -((self.size.radius - 5) * radianY),
                        'dy': dy[i],
                        'style': 'font-size:11px;fill:#616161'
                    }
                });
            }
        }
        
        self.element.indicatorGroup.appendChild(indicatorElement);
    });
};
GauageRange.prototype.renderGauage = function(percent) {
    if (percent === 0) {
        this.gauageColor = this.gradient[0];
        return;
    }
    
    var fromAngle, toAngle,
        percentUnit = 100 / this.rangeLength,
        gauageIndex = 0;
    
    if (this.side === 'left') {
        fromAngle = 180;
        toAngle = 180;
    } else {
        fromAngle = 0;
        toAngle = 0;
    }
    
    while (percent > 0) {
        var fromColor, toColor, linecap;
        
        if (percent > percentUnit) {
            fromAngle = toAngle;
            toAngle = fromAngle + percentUnit * 1.8;
            fromColor = this.gradient[gauageIndex];
            toColor = this.gradient[gauageIndex + 1];
            linecap = 'butt';
        } else {
            fromAngle = toAngle;
            toAngle = fromAngle + percent * 1.8;
            fromColor = this.gradient[gauageIndex];
            toColor = GauageRange.util.color.getGradientPoint(this.gradient[gauageIndex], this.gradient[gauageIndex + 1], percent / percentUnit);
            linecap = 'round';
        }
        
        var gradientId = 'chart-gradient-' + this.rangeId + '-' + gauageIndex;
        var gradientAttrs;
        if (fromAngle >= 0 && fromAngle < 90) {
            gradientAttrs = { x1: '0%', y1: '0%', x2: '100%', y2: '100%' };
        } else if (fromAngle >= 90 && fromAngle < 180) {
            gradientAttrs = { x1: '100%', y1: '0%', x2: '0%', y2: '100%' };
        } else if (fromAngle >= 180 && fromAngle < 270) {
            gradientAttrs = { x1: '100%', y1: '100%', x2: '0%', y2: '0%' };
        } else if (fromAngle >= 270 && fromAngle < 360) {
            gradientAttrs = { x1: '0%', y1: '100%', x2: '100%', y2: '0%' };
        }
        var gradientDefElement = GauageRange.util.svg.createGradientDefElement(gradientId, 'linearGradient', {
            0: fromColor,
            100: toColor
        }, gradientAttrs);
        var arcElement = GauageRange.util.svg.createElement({
            tagName: 'path',
            attrs: {
                'd': GauageRange.util.geometry.describeArc(0, this.size.total, this.size.total - this.size.gauage / 2, fromAngle, toAngle),
                'stroke': 'url(#' + gradientId + ')',
                'stroke-width': this.size.gauage,
                'stroke-linecap': linecap
            }
        });
        
        this.element.defs.appendChild(gradientDefElement);
        this.element.gauageGroup.appendChild(arcElement);
        
        percent -= percentUnit;
        gauageIndex++;
    }
    
    this.gauageColor = toColor;
};
GauageRange.prototype.renderPanel = function() {
    var hslColor = GauageRange.util.color.rgbToHsl(this.gauageColor);
    var radialToColor = {
            h: hslColor.h,
            s: hslColor.s,
            l: hslColor.l - 10
        },
        radialFromColor = {
            h: hslColor.h,
            s: hslColor.s,
            l: hslColor.l + 3
        },
        gradientId = 'chart-panel-gradient-' + this.rangeId;
    
    var radialGradientDefElement = GauageRange.util.svg.createGradientDefElement(gradientId, 'radialGradient', {
        0: radialFromColor,
        100: radialToColor
    }, {
        'cx': '50%',
        'cy': '35%'
    });
    
    var panelElement = GauageRange.util.svg.createElement({
        tagName: 'circle',
        attrs: {
            'cx': this.side === 'left' ? this.size.total : 0,
            'cy': this.size.total,
            'r': this.size.radius,
            'fill': 'url(#' + gradientId + ')',
            'stroke': '#FFF',
            'stroke-width': this.size.indicator,
            'style': 'filter:url(#chart-panel-shadow-' + this.rangeId + ')'
        }
    });
    
    this.element.defs.appendChild(radialGradientDefElement);
    this.element.svg.insertBefore(panelElement, this.element.indicatorGroup);
};
GauageRange.prototype.getCurrentHexColor = function() {
    return '#' + GauageRange.util.color.rgbToHex(this.gauageColor);
};
GauageRange.util = {
    geometry: {
        polarToCartesian: function(centerX, centerY, radius, angleInDegrees) {
            var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;
    
            return {
                x: centerX + (radius * Math.cos(angleInRadians)),
                y: centerY + (radius * Math.sin(angleInRadians))
            };
        },
        describeArc: function(x, y, radius, startAngle, endAngle) {
            var start = GauageRange.util.geometry.polarToCartesian(x, y, radius, endAngle + 1);
            var end = GauageRange.util.geometry.polarToCartesian(x, y, radius, startAngle - 1);
            var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
            return [ "M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
        }
    },
    color: {
        hexToRgb: function(hex) {
            return {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16)
            };
        },
        rgbToHex: function(rgb) {
            return toDoubleDigit(rgb.r.toString(16).toUpperCase())
                + toDoubleDigit(rgb.g.toString(16).toUpperCase())
                + toDoubleDigit(rgb.b.toString(16).toUpperCase());
    
            function toDoubleDigit(digit) {
                return digit.length < 2 ? '0' + digit : digit;
            }
        },
        rgbToHsl: function(rgb) {
            var r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255,
                max = Math.max(r, g, b), min = Math.min(r, g, b),
                h = 0, s = 0, l = (max + min) / 2;
    
            if (max !== min) {
                s = l < 0.5 ? (max - min) / (max + min) : (max - min) / (2.0 - max - min);
                h = r === max ? (g - b) / (max - min) : g === max ? 2.0 + (b - r) / (max - min) : 4.0 + (r - g) / (max - min);
            }
    
            h = h < 0 ? Math.round(h * 60 + 360) : Math.round(h * 60);
            s = Math.round(s * 100);
            l = Math.round(l * 100);
    
    
            return { h: h, s: s, l: l }
        },
        toWebColorFormat(colorMap) {
            var result = '';
    
            if (colorMap.hasOwnProperty('r') && colorMap.hasOwnProperty('g') && colorMap.hasOwnProperty('b')) {
                result = 'rgb(' + colorMap.r + ',' + colorMap.g + ',' + colorMap.b + ')';
            } else if (colorMap.hasOwnProperty('h') && colorMap.hasOwnProperty('s') && colorMap.hasOwnProperty('l')) {
                result = 'hsl(' + colorMap.h + ',' + colorMap.s + '%,' + colorMap.l + '%)';
            }
    
            return result;
        },
        getGradientPoint(prevColor, nextColor, rate) {
            return {
                r: Math.floor(prevColor.r + (nextColor.r - prevColor.r) * rate),
                g: Math.floor(prevColor.g + (nextColor.g - prevColor.g) * rate),
                b: Math.floor(prevColor.b + (nextColor.b - prevColor.b) * rate)
            };
        },
        unifyColorFormat(colorArray, format) {
            if (format === 'rgb') {
                colorArray.forEach(function(color, i, colorArray) {
                    if (typeof color === 'string' && color[0] === '#') {
                        colorArray[i] = GauageRange.util.color.hexToRgb(color.substr(1));
                    }
                });
            }
            
            return colorArray;
        }
    },
    svg: {
        setAttributes: function(svg, attrs) {
            for (var attr in attrs) {
                if (attrs.hasOwnProperty(attr)) {
                    svg.setAttributeNS(null, attr, attrs[attr]);
                }
            }
        },
        createElement: function(options) {
            var xmlns = 'http://www.w3.org/2000/svg';
            var element = document.createElementNS(xmlns, options.tagName);
    
            if (options.text) {
                element.innerHTML = options.text;
            }
    
            if (options.attrs) {
                GauageRange.util.svg.setAttributes(element, options.attrs);
            }
    
            return element;
        },
        createGradientDefElement: function(id, tagName, colorMap, attrs) {
            var gradientDef = GauageRange.util.svg.createElement({ tagName: tagName, attrs: { id: id } });
    
            if (attrs) GauageRange.util.svg.setAttributes(gradientDef, attrs);
    
            for (var offset in colorMap) {
                if (colorMap.hasOwnProperty(offset)) {
                    var offsetElement = GauageRange.util.svg.createElement({
                        tagName: 'stop',
                        attrs: {
                            'offset': offset + '%',
                            'stop-color': GauageRange.util.color.toWebColorFormat(colorMap[offset])
                        }
                    });
            
                    gradientDef.appendChild(offsetElement);
                }
            }
    
            return gradientDef;
        },
        createInnerShadowElement: function(id, offsetX, offsetY, blur, color, opacity) {
            var filterElement = GauageRange.util.svg.createElement({
                tagName: 'filter',
                attrs: {
                    id: id
                }
            });
            
            filterElement.innerHTML += '<feOffset dx="' + offsetX + '" dy="' + offsetY + '"></feOffset>';
            filterElement.innerHTML += '<feGaussianBlur stdDeviation="' + blur + '" result="offset-blur"></feGaussianBlur>';
            filterElement.innerHTML += '<feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"></feComposite>';
            filterElement.innerHTML += '<feFlood flood-color="'+ color + '" flood-opacity="' + opacity +'" result="color"></feFlood>';
            filterElement.innerHTML += '<feComposite operator="in" in="color" in2="inverse" result="shadow"></feComposite>';
            filterElement.innerHTML += '<feComposite operator="over" in="shadow" in2="SourceGraphic"></feComposite>';
            
            return filterElement;
        }
    }
};
GauageRange.rangeId = 0;
