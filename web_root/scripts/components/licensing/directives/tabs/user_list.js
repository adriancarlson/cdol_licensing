'use strict'
define(require => {
	const module = require('components/licensing/module')

	module.directive('userList', [
		function () {
			return {
				templateUrl: '/admin/licensing/views/tabs/user_list.html'
			}
		}
	])
})
