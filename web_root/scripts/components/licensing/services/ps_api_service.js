'use strict'
define(function (require) {
	var module = require('components/licensing/module')
	module.factory('psApiService', [
		'$http',
		'$q',
		'formatService',
		function ($http, $q, formatService) {
			return {
				psApiCall: (tableName, method, payload, recId) => {
					let deferredResponse = $q.defer()
					tableName = tableName.toLowerCase()
					let path = `/ws/schema/table/${tableName}`
					let url = `${path}${recId ? `/${recId}` : ''}`
					let headers = {
						Accept: 'application/json',
						'Content-Type': 'application/json'
					}
					let httpObject = {
						url: `${url}`,
						method: method,
						headers: headers
					}
					// copying payload using spread, to keep original payload object in tact. apiPayload is what will be submitted with any API call below.
					let apiPayload = { ...payload }
					// Unique Headers
					switch (method) {
						//Create
						case 'POST':
						case 'PUT':
							if (apiPayload.dateKeys) {
								apiPayload = formatService.objIterator(apiPayload, apiPayload.dateKeys, 'formatDateForApi')
							}
							delete apiPayload.dateKeys
							if (apiPayload.checkBoxKeys) {
								apiPayload = formatService.objIterator(apiPayload, apiPayload.checkBoxKeys, 'formatChecksForApi')
							}
							delete apiPayload.checkBoxKeys
							if (apiPayload.titleKeys) {
								apiPayload = formatService.objIterator(apiPayload, apiPayload.titleKeys, 'titleCase')
							}
							delete apiPayload.titleKeys
							if (apiPayload.sentenceKeys) {
								apiPayload = formatService.objIterator(apiPayload, apiPayload.sentenceKeys, 'sentenceCase')
							}
							delete apiPayload.sentenceKeys
							if (apiPayload.deleteKeys) {
								apiPayload = formatService.objIterator(apiPayload, apiPayload.deleteKeys, 'deleteKeys')
							}
							delete apiPayload.deleteKeys
							const data = { tables: {} }
							data.tables[tableName] = apiPayload
							httpObject['data'] = data
							break
						//READ
						case 'GET':
							httpObject['params'] = {
								projection: '*'
							}
							break
					}

					$http(httpObject).then(
						res => {
							let statusCode = res.status
							let responseText = res.statusText

							switch (method) {
								case 'POST':
								case 'PUT':
									let result = res.data.result[0].success_message.id || []
									deferredResponse.resolve({
										result: result,
										response_statuscode: statusCode,
										response_text: responseText
									})
									break
								case 'GET':
									let resData = res.data.tables[tableName]
									deferredResponse.resolve({
										data: resData,
										response_statuscode: statusCode,
										response_text: responseText
									})
									break
								case 'DELETE':
									deferredResponse.resolve({
										response_statuscode: statusCode,
										response_text: responseText
									})
									break
							}
						},
						res => {
							deferredResponse.resolve({
								response_statuscode: res.status,
								response_text: res.statusText
							})
							psAlert({ message: `There was an error ${method}ing the data to ${tableName}`, title: `${method} Error` })
						}
					)
					return deferredResponse.promise
				}
			}
		}
	])
})
