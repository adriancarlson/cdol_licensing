'use strict'
define(function (require) {
	let module = require('components/licensing/module')
	module.factory('pqService', [
		'$q',
		'$http',
		function ($q, $http) {
			return {
				//query - the name of the PowerQuery
				//data - JavaScript Object including any parameters that must be passed to the query
				getPQResults: (query, data, curSelect) => {
					let deferredResponse = $q.defer()
					// Build params object
					let params = { pagesize: 0 }

					// If curSelect is passed, add the 'dofor' parameter
					if (curSelect) {
						params.dofor = 'selection:selectedstudents'
					}

					$http({
						url: '/ws/schema/query/' + query,
						method: 'POST',
						data: data || {},
						params: params,
						headers: {
							Accept: 'application/json',
							'Content-Type': 'application/json'
						}
					}).then(
						res => {
							deferredResponse.resolve(res.data.record || [])
						},
						res => {
							psAlert({ message: `There was an error loading the data from ${query}`, title: 'Error Loading Data' })
						}
					)
					return deferredResponse.promise
				}
			}
		}
	])
})
