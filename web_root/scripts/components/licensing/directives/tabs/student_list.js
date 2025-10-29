'use strict'
define(require => {
	const module = require('components/licensing/module')

	module.directive('studentList', [
		function () {
			return {
				templateUrl: '/admin/licensing/views/tabs/student_list.html'
			}
		}
	])
})
