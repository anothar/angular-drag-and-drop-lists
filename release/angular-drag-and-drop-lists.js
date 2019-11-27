var dndList;
(function (dndList) {
    function directive() {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
        }
        return function (target) {
            var directive = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return (function (classConstructor, args, ctor) {
                    ctor.prototype = classConstructor.prototype;
                    var child = new ctor;
                    var result = classConstructor.apply(child, args);
                    return typeof result === "object" ? result : child;
                })(target, args, function () {
                    return null;
                });
            };
            directive.$inject = values;
            return directive;
        };
    }
    dndList.directive = directive;
})(dndList || (dndList = {}));

var dndList;
(function (dndList) {
    var DndService = (function () {
        function DndService($rootScope) {
            this.$rootScope = $rootScope;
            this._dragPositionChangedHandlers = [];
            this._dropHandlers = [];
        }
        Object.defineProperty(DndService.prototype, "isDragging", {
            get: function () {
                return this._isDragging;
            },
            set: function (value) {
                if (this._isDragging !== value) {
                    this._isDragging = value;
                    this.broadcastIsDraggingChanged(value);
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DndService.prototype, "dragPosition", {
            get: function () {
                return angular.copy(this._dragPosition);
            },
            set: function (value) {
                if (value && (!this._dragPosition || this._dragPosition.x != value.x ||
                    this._dragPosition.y != value.y)) {
                    this._dragPosition = angular.copy(value);
                    this.broadcastDragPositionChanged();
                }
            },
            enumerable: true,
            configurable: true
        });
        DndService.prototype.subscribeIsDraggingChanged = function ($scope, onDraggingChangedHandler) {
            $scope.$on(DndService._DndService_IsDraggingChanged_, function (event, args) {
                onDraggingChangedHandler(args);
            });
        };
        DndService.prototype.subscribeDragPositionChanged = function ($scope, onDragPositionChangedHandler) {
            var _this = this;
            this._dragPositionChangedHandlers.push(onDragPositionChangedHandler);
            $scope.$on('$destroy', function () {
                _this._dragPositionChangedHandlers.splice(_this._dragPositionChangedHandlers.indexOf(onDragPositionChangedHandler), 1);
            });
        };
        DndService.prototype.subscribeDrop = function ($scope, onDropHandler) {
            var _this = this;
            this._dropHandlers.push(onDropHandler);
            $scope.$on('$destroy', function () {
                _this._dropHandlers.splice(_this._dropHandlers.indexOf(onDropHandler), 1);
            });
        };
        DndService.prototype.drop = function () {
            return __awaiter(this, void 0, void 0, function () {
                var position, index, handler, result, res;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            position = angular.copy(this._dragPosition);
                            index = 0;
                            _a.label = 1;
                        case 1:
                            if (!(index < this._dropHandlers.length)) return [3, 5];
                            handler = this._dropHandlers[index];
                            result = handler(position);
                            if (!(result.success !== undefined)) return [3, 2];
                            if (result.success) {
                                this.isDragging = false;
                                return [2, result];
                            }
                            return [3, 4];
                        case 2: return [4, result];
                        case 3:
                            res = _a.sent();
                            if (res.success) {
                                this.isDragging = false;
                                return [2, result];
                            }
                            _a.label = 4;
                        case 4:
                            index++;
                            return [3, 1];
                        case 5:
                            this.isDragging = false;
                            return [2, {
                                    success: false
                                }];
                    }
                });
            });
        };
        DndService.prototype.broadcastDragPositionChanged = function () {
            var position = angular.copy(this._dragPosition);
            for (var _i = 0, _a = this._dragPositionChangedHandlers; _i < _a.length; _i++) {
                var handler = _a[_i];
                handler(position);
            }
        };
        DndService.prototype.broadcastIsDraggingChanged = function (isDragging) {
            this.$rootScope.$broadcast(DndService._DndService_IsDraggingChanged_, isDragging);
        };
        DndService._DndService_IsDraggingChanged_ = '_DndService_IsDraggingChanged_';
        DndService.$inject = ['$rootScope'];
        return DndService;
    }());
    angular.module('dndLists', []).service('dndService', DndService);
})(dndList || (dndList = {}));

var dndList;
(function (dndList) {
    var DndDraggable = (function () {
        function DndDraggable($parse, $timeout, dndService, $window) {
            var _this = this;
            this.$parse = $parse;
            this.$timeout = $timeout;
            this.dndService = dndService;
            this.$window = $window;
            this.link = function (scope, element, attrs) { return __awaiter(_this, void 0, void 0, function () {
                var self, isMouseDown, mousemove, mousedown, mouseUp, unregisterDrag, registerDrag, clickHandler, registerClick, draggableElements, handleString;
                var _this = this;
                return __generator(this, function (_a) {
                    self = this;
                    mousemove = function (event) {
                        _this.performDrag(scope, element, event, attrs);
                    };
                    mousedown = function (event) {
                        if (isMouseDown) {
                            mouseUp(event);
                            return;
                        }
                        event.preventDefault();
                        isMouseDown = true;
                        angular.element(window).off('mouseup', mouseUp);
                        angular.element(window).on('mouseup', mouseUp);
                        setTimeout(function () {
                            if (isMouseDown && !scope.dragging) {
                                _this.dragStart(scope, element, event, attrs);
                                angular.element(window).off('mousemove', mousemove);
                                angular.element(window).on('mousemove', mousemove);
                            }
                        }, 200);
                    };
                    mouseUp = function (event) {
                        isMouseDown = false;
                        angular.element(window).off('mouseup', mouseUp);
                        if (scope.dragging) {
                            _this.dragEnd(scope, element, event, attrs);
                            angular.element(window).off('mousemove', mousemove);
                        }
                    };
                    unregisterDrag = function () {
                        if (scope.dragging)
                            _this.dragEnd(scope, element, {
                                clientX: _this.dndService.dragPosition.x,
                                clientY: _this.dndService.dragPosition.y
                            }, attrs);
                        angular.element(window).off('mouseup', mouseUp);
                        angular.element(window).off('mousemove', mousemove);
                        if (draggableElements)
                            angular.element(draggableElements).off('mousedown', mousedown);
                    };
                    registerDrag = function (elements, remember) {
                        if (remember === void 0) { remember = true; }
                        if (typeof elements == 'string') {
                            elements = element[0].querySelectorAll(elements);
                            if (remember)
                                draggableElements = elements;
                            for (var i = 0; i < elements.length; i++)
                                registerDrag(elements[i], false);
                            return;
                        }
                        if (remember)
                            draggableElements = elements;
                        angular.element(elements).off('mousedown', mousedown);
                        angular.element(elements).on('mousedown', mousedown);
                    };
                    if (attrs.ngDisabled) {
                        scope.disabled = scope.$eval(attrs.ngDisabled);
                        scope.$watch(attrs.ngDisabled, function (newValue, oldValue) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                scope.disabled = newValue;
                                if (!newValue)
                                    registerDrag(draggableElements);
                                else
                                    unregisterDrag();
                                return [2];
                            });
                        }); });
                    }
                    clickHandler = function (event) {
                        if (scope.disabled)
                            return;
                        if (!attrs.dndSelected)
                            return;
                        scope.$apply(function () {
                            self.$parse(attrs.dndSelected)(scope, { event: event });
                        });
                        event.stopPropagation();
                    };
                    registerClick = function () {
                        element.off('click touchstart', clickHandler);
                        element.on('click touchstart', clickHandler);
                    };
                    registerClick();
                    if (attrs.dndHandle) {
                        handleString = scope.$eval(attrs.dndHandle);
                        registerDrag(handleString);
                        scope.$watch(attrs.dndHandle, function (newValue, oldValue, scope) {
                            unregisterDrag();
                            registerDrag(newValue);
                        });
                    }
                    else {
                        registerDrag(element[0]);
                    }
                    scope.$on('$destroy', function () {
                        return unregisterDrag();
                    });
                    return [2];
                });
            }); };
        }
        DndDraggable.prototype.dragEnd = function (scope, element, event, attrs) {
            return __awaiter(this, void 0, void 0, function () {
                var drop;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!scope.dragging)
                                return [2];
                            this.performDrag(scope, element, event, attrs);
                            scope.dragging = false;
                            this.dndService.draggingElement.parentNode.removeChild(this.dndService.draggingElement);
                            element.removeClass("dndDragging");
                            return [4, this.dndService.drop()];
                        case 1:
                            drop = _a.sent();
                            this.$timeout(function () {
                                element[0].style.display = 'block';
                                angular.element(document.body).removeClass('dndDraggingBody');
                                if (drop.success) {
                                    if (!_this.$parse(attrs.dndMoved)(scope, { event: event })) {
                                        if (drop.callback)
                                            drop.callback(true);
                                        return;
                                    }
                                }
                                else {
                                    _this.$parse(attrs.dndCanceled)(scope, { event: event });
                                    if (drop.callback)
                                        drop.callback(false);
                                    return;
                                }
                                _this.$parse(attrs.dndDragend)(scope, { event: event, isDroped: true });
                                if (drop.callback)
                                    drop.callback(true);
                            }, 0);
                            return [2];
                    }
                });
            });
        };
        DndDraggable.prototype.dragStart = function (scope, element, event, attrs) {
            var _this = this;
            if (scope.disabled)
                return;
            if (scope.dragging)
                return;
            scope.dragging = true;
            angular.element(document.body).addClass('dndDraggingBody');
            var source = element[0];
            var rect = source.getBoundingClientRect();
            var mouseX = rect.left - event.clientX;
            var mouseY = rect.top - event.clientY;
            scope.mouseStartPosition = {
                x: mouseX,
                y: mouseY
            };
            var transformX = 0;
            var transformY = 0;
            var newNode = element[0].cloneNode(true);
            var newElement = angular.element(newNode);
            newElement.addClass("dndDragging");
            newElement.css('width', rect.width + "px");
            newElement.css('height', rect.height + "px");
            document.body.appendChild(newElement[0]);
            rect = source.getBoundingClientRect();
            transformX += event.clientX - rect.left + mouseX;
            transformY += event.clientY - rect.top + mouseY;
            scope.transform = {
                x: transformX,
                y: transformY
            };
            newNode.style.webkitTransform =
                newNode.style.transform =
                    'translate(' + transformX + 'px, ' + transformY + 'px)';
            source.style.display = 'none';
            this.dndService.draggingObject = scope.$eval(attrs.dndDraggable);
            this.dndService.draggingElementScope = scope;
            this.dndService.draggingElement = newNode;
            this.dndService.draggingSourceElement = element[0];
            this.dndService.isDragging = true;
            this.$timeout(function () {
                _this.$parse(attrs.dndDragstart)(scope, { event: event });
                _this.performDrag(scope, element, event, attrs);
            }, 0);
        };
        DndDraggable.prototype.performDrag = function (scope, element, event, attrs) {
            if (scope.disabled)
                return;
            if (!scope.dragging)
                return;
            var target = this.dndService.draggingElement;
            var rect = target.getBoundingClientRect();
            scope.transform.x += event.clientX - rect.left + scope.mouseStartPosition.x;
            scope.transform.y += event.clientY - rect.top + scope.mouseStartPosition.y;
            if (event.clientX >= 0 && event.clientX < this.$window.outerWidth &&
                event.clientY >= 0 && event.clientY < this.$window.outerHeight) {
                target.style.webkitTransform =
                    target.style.transform =
                        'translate(' + scope.transform.x + 'px, ' + scope.transform.y + 'px)';
                this.dndService.dragPosition = {
                    x: event.clientX,
                    y: event.clientY
                };
            }
        };
        DndDraggable = __decorate([
            dndList.directive('$parse', '$timeout', 'dndService', '$window')
        ], DndDraggable);
        return DndDraggable;
    }());
    angular.module('dndLists').directive('dndDraggable', DndDraggable);
})(dndList || (dndList = {}));

var dndList;
(function (dndList) {
    var DndList = (function () {
        function DndList($parse, $timeout, dndService, $q) {
            var _this = this;
            this.$parse = $parse;
            this.$timeout = $timeout;
            this.dndService = dndService;
            this.$q = $q;
            this.link = function (scope, element, attrs) {
                var placeholder = _this.getPlaceholderElement(element);
                placeholder.remove();
                var self = _this;
                scope.placeholder = placeholder;
                scope.element = element;
                var interactOptions = {};
                if (attrs.dndAccept)
                    interactOptions.accept = attrs.dndAccept;
                var dragEvent = function (position) {
                    _this.dragging(scope, element[0], position, attrs);
                };
                _this.dndService.subscribeDragPositionChanged(scope, function (value) {
                    dragEvent(value);
                });
                _this.dndService.subscribeIsDraggingChanged(scope, function (value) {
                    if (!value)
                        _this.stopDrag(scope);
                });
                _this.dndService.subscribeDrop(scope, function (position) {
                    return _this.tryDrop(scope, position, attrs);
                });
                if (attrs.ngDisabled) {
                    scope.disabled = scope.$eval(attrs.ngDisabled);
                    scope.$watch(attrs.ngDisabled, function (newValue, oldValue) {
                        scope.disabled = newValue;
                        if (!newValue)
                            _this.stopDrag(scope);
                    });
                }
            };
        }
        DndList.prototype.isMouseInFirstHalf = function (position, targetNode, horizontal) {
            if (horizontal === void 0) { horizontal = false; }
            var mousePointer = horizontal ? position.x
                : position.y;
            var rect = targetNode.getBoundingClientRect();
            var targetSize = horizontal ? rect.width : rect.height;
            var targetPosition = horizontal ? rect.left : rect.top;
            return mousePointer < targetPosition + targetSize / 2;
        };
        DndList.prototype.checkInRange = function (scope, element, position) {
            var rect = element.getBoundingClientRect();
            if (position.x > rect.right || position.x < rect.left
                || position.y > rect.bottom || position.y < rect.top
                || !this.dndService.isDragging || scope.disabled)
                return false;
            return true;
        };
        DndList.prototype.dragging = function (scope, element, position, attrs) {
            if (!this.checkInRange(scope, element, position)) {
                this.stopDrag(scope);
            }
            else {
                if (!scope.isDraggingOver)
                    this.startDrag(scope, element, position, attrs);
                else
                    this.performDrag(scope, element, position, attrs);
            }
        };
        DndList.prototype.stopDrag = function (scope) {
            if (!scope.isDraggingOver)
                return;
            scope.isDraggingOver = false;
            scope.placeholder.remove();
            scope.element.removeClass("dndDragover");
        };
        DndList.prototype.startDrag = function (scope, element, position, attrs) {
            if (scope.disabled || !this.dndService.isDragging)
                return;
            var source = angular.element(this.dndService.draggingElement);
            var display = source.css('display');
            source.css('display', 'none');
            var dragTarget = document.elementFromPoint(position.x, position.y);
            source.css('display', display);
            if (dragTarget && dragTarget !== element) {
                var listItemNode = dragTarget;
                while (listItemNode.parentNode !== element && listItemNode.parentNode) {
                    listItemNode = listItemNode.parentNode;
                }
                if (listItemNode && listItemNode.parentNode == element) {
                    scope.isDraggingOver = true;
                    this.performDrag(scope, element, position, attrs);
                }
            }
        };
        DndList.prototype.performDrag = function (scope, element, position, attrs) {
            if (scope.disabled || !this.dndService.isDragging)
                return;
            var source = angular.element(this.dndService.draggingElement);
            var placeholderNode = scope.placeholder[0];
            var listNode = scope.element[0];
            if (attrs.dndDragover)
                if (attrs.dndDragover &&
                    !this.invokeCallback(scope, attrs.dndDragover, position, this.getPlaceholderIndex(listNode, placeholderNode), this.dndService.draggingObject)) {
                    this.stopDrag(scope);
                    return;
                }
            if (placeholderNode.parentNode != listNode)
                element.parentNode.appendChild(placeholderNode);
            var dragTarget;
            var display = source.css('display');
            source.css('display', 'none');
            dragTarget = document.elementFromPoint(position.x, position.y);
            source.css('display', display);
            if (dragTarget && dragTarget !== listNode) {
                var listItemNode = dragTarget;
                while (listItemNode.parentNode !== listNode && listItemNode.parentNode) {
                    listItemNode = listItemNode.parentNode;
                }
                if (listItemNode.parentNode === listNode && listItemNode !== placeholderNode) {
                    if (this.isMouseInFirstHalf(position, listItemNode)) {
                        listNode.insertBefore(placeholderNode, listItemNode);
                    }
                    else {
                        listNode.insertBefore(placeholderNode, listItemNode.nextElementSibling);
                    }
                }
            }
            scope.element.addClass("dndDragover");
        };
        DndList.prototype.tryDrop = function (scope, position, attrs) {
            var _this = this;
            if (!this.checkInRange(scope, scope.element[0], position))
                return {
                    success: false
                };
            if (!scope.isDraggingOver)
                return {
                    success: false
                };
            var transferredObject = this.dndService.draggingObject;
            if (!transferredObject)
                return {
                    success: true
                };
            transferredObject = angular.copy(transferredObject);
            var placeholderNode = scope.placeholder[0];
            var listNode = scope.element[0];
            return new Promise(function (resolve, reject) {
                _this.$timeout(function () {
                    var index = _this.getPlaceholderIndex(listNode, placeholderNode);
                    if (index < 0) {
                        _this.stopDrag(scope);
                        resolve({
                            success: false
                        });
                        return;
                    }
                    if (attrs.dndDragover &&
                        !_this.invokeCallback(scope, attrs.dndDragover, position, index, transferredObject)) {
                        _this.stopDrag(scope);
                        resolve({
                            success: false
                        });
                        return;
                    }
                    if (attrs.dndBeforeDrop) {
                        var result = _this.invokeCallback(scope, attrs.dndBeforeDrop, position, index, transferredObject);
                        if (!result) {
                            _this.stopDrag(scope);
                            resolve({
                                success: false
                            });
                            return;
                        }
                    }
                    index = _this.getPlaceholderIndexWithoutNode(listNode, placeholderNode, _this.dndService.draggingSourceElement);
                    resolve({
                        success: true,
                        callback: function (result) {
                            _this.stopDrag(scope);
                            if (!result)
                                return;
                            if (attrs.dndDrop) {
                                transferredObject = _this.invokeCallback(scope, attrs.dndDrop, position, index, transferredObject);
                            }
                            if (transferredObject !== true) {
                                scope.$eval(attrs.dndList).splice(index, 0, transferredObject);
                            }
                            _this.invokeCallback(scope, attrs.dndInserted, position, index, transferredObject);
                        }
                    });
                }, 0);
            });
        };
        DndList.prototype.getPlaceholderIndex = function (listNode, placeholderNode) {
            return Array.prototype.indexOf.call(listNode.children, placeholderNode);
        };
        DndList.prototype.getPlaceholderIndexWithoutNode = function (listNode, placeholderNode, ignoreNode) {
            var result = 0;
            for (var i = 0; i < listNode.children.length; i++, result++) {
                if (listNode.children[i] == placeholderNode)
                    return result;
                if (listNode.children[i] == ignoreNode)
                    result--;
            }
            return result;
        };
        DndList.prototype.invokeCallback = function (scope, expression, position, index, item) {
            if (item === void 0) { item = null; }
            return this.$parse(expression)(scope, {
                position: position,
                index: index,
                item: item || undefined
            });
        };
        DndList.prototype.getPlaceholderElement = function (element) {
            var placeholder;
            angular.forEach(element.children(), function (childNode) {
                var child = angular.element(childNode);
                if (child.hasClass('dndPlaceholder')) {
                    placeholder = child;
                }
            });
            return placeholder || angular.element("<li class='dndPlaceholder'></li>");
        };
        DndList = __decorate([
            dndList.directive('$parse', '$timeout', 'dndService', '$q')
        ], DndList);
        return DndList;
    }());
    angular.module('dndLists').directive('dndList', DndList);
})(dndList || (dndList = {}));

var dndList;
(function (dndList) {
    var DndScroll = (function () {
        function DndScroll($timeout, dndService) {
            var _this = this;
            this.$timeout = $timeout;
            this.dndService = dndService;
            this.scope = {
                dndScroll: "="
            };
            this.link = function (scope, element, attrs) {
                if (!scope.dndScroll.speed)
                    scope.dndScroll.speed = 6;
                if (!scope.dndScroll.offset)
                    scope.dndScroll.offset = 20;
                if (!scope.dndScroll.offsetOuter)
                    scope.dndScroll.offsetOuter = 0;
                var dragEvent = function (position) {
                    _this.dragging(scope, element[0], position.x, position.y);
                };
                _this.dndService.subscribeDragPositionChanged(scope, function (value) {
                    dragEvent(value);
                });
                _this.dndService.subscribeIsDraggingChanged(scope, function (value) {
                    if (!value)
                        _this.stopScroll(scope);
                });
            };
        }
        DndScroll.prototype.isInRange = function (scope, element, x, y) {
            var offset = scope.dndScroll.offset;
            var offsetOuter = scope.dndScroll.offsetOuter;
            var rect = element.getBoundingClientRect();
            if (x > rect.right || x < rect.left) {
                return false;
            }
            else if (y >= rect.bottom - offset && y <= rect.bottom + offsetOuter)
                return true;
            else if (y <= rect.top + offset && y >= rect.top - offsetOuter)
                return true;
            else
                return false;
            return false;
        };
        DndScroll.prototype.dragging = function (scope, element, x, y) {
            var offset = scope.dndScroll.offset;
            var offsetOuter = scope.dndScroll.offsetOuter;
            var rect = element.getBoundingClientRect();
            if (x > rect.right || x < rect.left) {
                this.stopScroll(scope);
            }
            else if (y >= rect.bottom - offset && y <= rect.bottom + offsetOuter)
                this.startScroll(scope, element, 1);
            else if (y <= rect.top + offset && y >= rect.top - offsetOuter)
                this.startScroll(scope, element, -1);
            else
                this.stopScroll(scope);
        };
        DndScroll.prototype.startScroll = function (scope, element, direction) {
            this.stopScroll(scope);
            this.performScroll(scope, element, direction);
        };
        DndScroll.prototype.performScroll = function (scope, element, direction) {
            var _this = this;
            if (!this.dndService.isDragging)
                return;
            if (!this.isInRange(scope, element, this.dndService.dragPosition.x, this.dndService.dragPosition.y))
                return;
            var scrollOffset = 0;
            if (direction == 1) {
                scrollOffset = scope.dndScroll.speed;
                if (element.scrollTop + scrollOffset + element.offsetHeight > element.scrollHeight)
                    scrollOffset = element.scrollHeight - element.scrollTop - element.offsetHeight;
                if (scrollOffset < 0)
                    scrollOffset = 0;
            }
            else if (direction == -1) {
                scrollOffset = -scope.dndScroll.speed;
                if (element.scrollTop + scrollOffset < 0)
                    scrollOffset = -element.scrollTop;
            }
            element.scrollTop += scrollOffset;
            scope.timer = setTimeout(function () {
                _this.performScroll(scope, element, direction);
            }, 20);
        };
        DndScroll.prototype.stopScroll = function (scope) {
            if (!scope.timer)
                return;
            clearTimeout(scope.timer);
            scope.timer = null;
        };
        DndScroll = __decorate([
            dndList.directive('$timeout', 'dndService')
        ], DndScroll);
        return DndScroll;
    }());
    angular.module('dndLists').directive('dndScroll', DndScroll);
})(dndList || (dndList = {}));

var dndList;
(function (dndList) {
    function IsIE() {
        if (/MSIE 10/i.test(navigator.userAgent)) {
            return true;
        }
        if (/MSIE 9/i.test(navigator.userAgent) || /rv:11.0/i.test(navigator.userAgent)) {
            return true;
        }
        return false;
    }
    dndList.IsIE = IsIE;
})(dndList || (dndList = {}));
