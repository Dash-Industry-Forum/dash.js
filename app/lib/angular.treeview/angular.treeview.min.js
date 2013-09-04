/*
	@license Angular Treeview version 0.1.4
	ⓒ 2013 AHN JAE-HA http://github.com/eu81273/angular.treeview
	License: MIT
*/

(function(e){e.module("angularTreeview",[]).directive("treeModel",function($compile){return{restrict:"A",link:function(a,g,b){var f=b.treeModel,d=b.nodeLabel||"label",c=b.nodeChildren||"children",d='<ul><li data-ng-repeat="node in '+f+'"><i class="collapsed" data-ng-show="node.'+c+'.length && node.collapsed" data-ng-click="selectNodeHead(node)"></i><i class="expanded" data-ng-show="node.'+c+'.length && !node.collapsed" data-ng-click="selectNodeHead(node)"></i><i class="normal" data-ng-hide="node.'+c+'.length"></i> <span data-ng-class="node.selected" data-ng-click="selectNodeLabel(node)">{{node.'+
d+'}}</span><div data-ng-hide="node.collapsed" data-tree-model="node.'+c+'" data-node-id='+(b.nodeId||"id")+" data-node-label="+d+" data-node-children="+c+"></div></li></ul>";f&&f.length&&(b.angularTreeview&&(a.selectNodeHead=a.selectNodeHead||function(a){a.collapsed=!a.collapsed},a.selectNodeLabel=a.selectNodeLabel||function(b){a.currentNode&&a.currentNode.selected&&(a.currentNode.selected=void 0);b.selected="selected";a.currentNode=b}),g.html(null).append($compile(d)(a)))}}})})(angular);