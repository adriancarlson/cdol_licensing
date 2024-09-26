'use strict'
define(function (require) {
	let module = require('components/licensing/module')

	module.directive('userList', [
		function () {
			return {
				templateUrl: '/admin/licensing/views/tabs/user_list.html'
			}
		}
	])
})
