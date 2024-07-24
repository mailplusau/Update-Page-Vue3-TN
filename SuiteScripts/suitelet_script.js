/**
 * @author Tim Nguyen
 * @description NetSuite Experimentation - Test Page
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @created 27/06/2023
 */

import {VARS} from '@/utils/utils.mjs';
import { address as addressFields, addressSublist as addressSublistFields, contact as contactFields, ncLocation } from '@/utils/defaults.mjs';

// These variables will be injected during upload. These can be changed under 'netsuite' of package.json
let htmlTemplateFilename/**/;
let clientScriptFilename/**/;

// Surcharge rates according to https://mailplus.com.au/surcharge/
const defaultValues = {
    expressFuelSurcharge: import.meta.env.VITE_NS_EXPRESS_FUEL_SURCHARGE, // custentity_mpex_surcharge_rate
    standardFuelSurcharge: import.meta.env.VITE_NS_STANDARD_FUEL_SURCHARGE, // custentity_sendle_fuel_surcharge
    serviceFuelSurcharge: import.meta.env.VITE_NS_SERVICE_FUEL_SURCHARGE, // custentity_service_fuel_surcharge_percen

    shortIoEndpoint: import.meta.env.VITE_SHORT_IO_ENDPOINT,
    shortIoKey: import.meta.env.VITE_SHORT_IO_KEY,
    smsSenderNumber: import.meta.env.VITE_SMS_SENDER_NUMBER,
    twilioSecret: import.meta.env.VITE_TWILIO_SECRET,
    twilioEndpoint: import.meta.env.VITE_TWILIO_ENDPOINT,
}

const defaultTitle = VARS.pageTitle;

let NS_MODULES = {};


// eslint-disable-next-line no-undef
define(['N/ui/serverWidget', 'N/render', 'N/search', 'N/file', 'N/log', 'N/record', 'N/email', 'N/runtime', 'N/https', 'N/task', 'N/format', 'N/url'],
    (serverWidget, render, search, file, log, record, email, runtime, https, task, format, url) => {
        NS_MODULES = {serverWidget, render, search, file, log, record, email, runtime, https, task, format, url};

        const onRequest = ({request, response}) => {
            if (request.method === "GET") {

                if (!_.handleGETRequests(request.parameters['requestData'], response)){
                    // Render the page using either inline form or standalone page
                    if (request.parameters['standalone']) _.getStandalonePage(response)
                    else _.getInlineForm(response)
                }

            } else if (request.method === "POST") { // Request method should be POST (?)
                _.handlePOSTRequests(JSON.parse(request.body), response);
                // _writeResponseJson(response, {test: 'test response from post', params: request.parameters, body: request.body});
            } else log.debug({ title: "request method type", details: `method : ${request.method}` });

        }

        const _ = {
            // Render the htmlTemplateFile as a standalone page without any of NetSuite's baggage. However, this also means no
            // NetSuite module will be exposed to the Vue app. Thus, an api approach using Axios and structuring this Suitelet as
            // a http request handler will be necessary. For reference:
            // https://medium.com/@vladimir.aca/how-to-vuetify-your-suitelet-on-netsuite-part-2-axios-http-3e8e731ac07c
            getStandalonePage(response) {
                let {file} = NS_MODULES;

                // Get the id and url of our html template file
                const htmlFileData = this.getHtmlTemplate(htmlTemplateFilename);

                // Load the  html file and store it in htmlFile
                const htmlFile = file.load({id: htmlFileData[htmlTemplateFilename].id});

                response.write(htmlFile['getContents']());
            },
            // Render the page within a form element of NetSuite. This can cause conflict with NetSuite's stylesheets.
            getInlineForm(response) {
                let {serverWidget} = NS_MODULES;

                // Create a NetSuite form
                let form = serverWidget['createForm']({ title: defaultTitle });

                // Retrieve client script ID using its file name.
                form.clientScriptFileId = this.getHtmlTemplate(clientScriptFilename)[clientScriptFilename].id;

                response['writePage'](form);
            },
            // Search for the ID and URL of a given file name inside the NetSuite file cabinet
            getHtmlTemplate(htmlPageName) {
                let {search} = NS_MODULES;

                const htmlPageData = {};

                search.create({
                    type: 'file',
                    filters: ['name', 'is', htmlPageName],
                    columns: ['name', 'url']
                }).run().each(resultSet => {
                    htmlPageData[resultSet['getValue']({ name: 'name' })] = {
                        url: resultSet['getValue']({ name: 'url' }),
                        id: resultSet['id']
                    };
                    return true;
                });

                return htmlPageData;
            },
            handleGETRequests(request, response) {
                if (!request) return false;

                let {log} = NS_MODULES;

                try {
                    let {operation, requestParams} = JSON.parse(request);

                    if (!operation) throw 'No operation specified.';

                    if (operation === 'getIframeContents') this.getIframeContents(response);
                    else if (!getOperations[operation]) throw `GET operation [${operation}] is not supported.`;
                    else getOperations[operation](response, requestParams);
                } catch (e) {
                    log.debug({title: "_handleGETRequests", details: `error: ${e}`});
                    _writeResponseJson(response, {error: `${e}`})
                }

                return true;
            },
            handlePOSTRequests({operation, requestParams}, response) {
                let {log} = NS_MODULES;

                try {
                    if (!operation) throw 'No operation specified.';

                    // _writeResponseJson(response, {source: '_handlePOSTRequests', operation, requestParams});
                    postOperations[operation](response, requestParams);
                } catch (e) {
                    log.debug({title: "_handlePOSTRequests", details: `error: ${e}`});
                    _writeResponseJson(response, {error: `${e}`})
                }
            },
            getIframeContents(response) {
                const htmlFileData = this.getHtmlTemplate(htmlTemplateFilename);
                const htmlFile = NS_MODULES.file.load({ id: htmlFileData[htmlTemplateFilename].id });

                _writeResponseJson(response, htmlFile['getContents']());
            }
        }

        return {onRequest};
    });

function _writeResponseJson(response, body) {
    response.write({ output: JSON.stringify(body) });
    response.addHeader({
        name: 'Content-Type',
        value: 'application/json; charset=utf-8'
    });
}


const getOperations = {
    'getCurrentUserDetails' : function (response) {
        let user = {role: NS_MODULES.runtime['getCurrentUser']().role, id: NS_MODULES.runtime['getCurrentUser']().id};
        let salesRep = {};

        if (parseInt(user.role) === 1000) {
            let franchiseeRecord = NS_MODULES.record.load({type: 'partner', id: user.id});
            let employeeId = franchiseeRecord.getValue({fieldId: 'custentity_sales_rep_assigned'});
            let employeeRecord = NS_MODULES.record.load({type: 'employee', id: employeeId});
            salesRep['id'] = employeeId;
            salesRep['name'] = `${employeeRecord.getValue({fieldId: 'firstname'})} ${employeeRecord.getValue({fieldId: 'lastname'})}`;
        }

        _writeResponseJson(response, {...user, salesRep});
    },
    'getCustomerDetails': function (response, {customerId, fieldIds}) {
        if (!customerId) return _writeResponseJson(response, {error: `Invalid Customer ID: ${customerId}`});

        _writeResponseJson(response, sharedFunctions.getCustomerData(customerId, fieldIds));
    },
    'getCustomerAddresses' : function (response, {customerId}) {
        if (!customerId) return _writeResponseJson(response, {error: `Invalid Customer ID: ${customerId}`});

        _writeResponseJson(response, sharedFunctions.getCustomerAddresses(customerId));
    },
    'getCustomerStatuses' : function (response) {
        let data = [];

        NS_MODULES.search.create({
            type: 'customerstatus',
            filters: [
                ['isinactive', 'is', false],
            ],
            columns: ['internalid']
        }).run().each(result => _utils.processSavedSearchResults(data, result));

        _writeResponseJson(response, data);
    },
    'getCustomerStatusById' : function(response, {statusId}) {
        let statusRecord = NS_MODULES.record.load({type: 'customerstatus', id: statusId});

        _writeResponseJson(response, {
            id: statusId,
            name: statusRecord.getValue({fieldId: 'name'}),
            stage: statusRecord.getValue({fieldId: 'stage'}),
            type: statusRecord.getValue({fieldId: 'type'}),
        });
    },
    'getCustomerContacts' : function (response, {customerId}) {
        if (!customerId) return _writeResponseJson(response, {error: `Invalid Customer ID: ${customerId}`});

        _writeResponseJson(response, sharedFunctions.getCustomerContacts(customerId));
    },
    'getFranchiseeOfCustomer' : function (response, {customerId, fieldIds}) {
        let partner = {};
        try {
            let result = NS_MODULES.search['lookupFields']({
                type: 'customer',
                id: customerId,
                columns: ['partner']
            });
            let partnerRecord = NS_MODULES.record.load({type: 'partner', id: result.partner ? result.partner[0].value : ''})
            for (let fieldId of fieldIds) {
                partner[fieldId] = partnerRecord['getValue']({fieldId});
                partner[fieldId + '_text'] = partnerRecord['getText']({fieldId});
            }

        } catch (e) {
            //
        }
        _writeResponseJson(response, partner);
    },
    'getCustomerInvoices' : function (response, {customerId}) {
        let {search} = NS_MODULES;
        let data = [];
        let columns = ['internalid', 'tranid', 'total', 'trandate', 'status']

        search.create({
            type: 'invoice',
            filters: [
                {name: 'entity', operator: 'is', values: customerId},
                {name: 'mainline', operator: 'is', values: true},
                {name: 'memorized', operator: 'is', values: false},
                {name: 'custbody_inv_type', operator: 'is', values: '@NONE@'},
                {name: 'voided', operator: 'is', values: false},
            ],
            columns: columns.map(item => ({name: item, sort: item === 'trandate' ? search.Sort.ASC : search.Sort.NONE}))
        }).run().each(function (result) {
            let tmp = {};

            for (let fieldId of columns) {
                tmp[fieldId] = result.getValue(fieldId);
                tmp[fieldId + '_text'] = result.getText(fieldId);
            }

            data.push(tmp);

            return true;
        });

        _writeResponseJson(response, data);
    },
    'getAssignedServices' : function (response, {customerId}) {
        let {search} = NS_MODULES;
        let data = [];

        let serviceSearch = search.load({
            id: 'customsearch_salesp_services',
            type: 'customrecord_service'
        });

        serviceSearch.filters.push(search.createFilter({
            name: 'custrecord_service_customer',
            operator: search.Operator.ANYOF,
            values: customerId
        }));

        let resultSetServices = serviceSearch.run();

        resultSetServices.each(item => {
            let tmp = {};

            for (let column of item.columns) {
                tmp[column.name] = item.getValue(column);
                tmp[column.name + '_text'] = item.getText(column);
            }

            data.push(tmp);

            return true;
        });

        _writeResponseJson(response, data);
    },
    'getItemPricing' : function (response, {customerId}) {
        let data = [];

        let customerRecord = NS_MODULES.record.load({type: 'customer', id: customerId, isDynamic: true});

        let lineCount = customerRecord['getLineCount']({sublistId: 'itempricing'});

        for (let line = 0; line < lineCount; line++) {
            data.push({
                name: customerRecord['getSublistText']({
                    sublistId: 'itempricing',
                    fieldId: 'item',
                    line
                }),
                price: customerRecord['getSublistValue']({
                    sublistId: 'itempricing',
                    fieldId: 'price',
                    line
                })
            })
        }

        _writeResponseJson(response, data);
    },
    'getServiceTypes' : function (response) {
        let {search} = NS_MODULES;
        let data = [];

        let serviceTypeSearch = search.create({
            type: 'customrecord_service_type',
            columns: [
                {name: 'internalid'},
                {name: 'custrecord_service_type_ns_item_array'},
                {name: 'name'}
            ]
        });
        serviceTypeSearch.filters.push(search.createFilter({
            name: 'custrecord_service_type_category',
            operator: search.Operator.ANYOF,
            values: [1] // NO IDEA WHAT THIS IS
        }));

        let searchResult = serviceTypeSearch.run();

        searchResult.each(item => {
            data.push({value: item.getValue('internalid'), text: item.getValue('name')})

            return true;
        });

        _writeResponseJson(response, data);
    },
    'getSelectOptions' : function (response, {id, type, valueColumnName, textColumnName}) {
        let {search} = NS_MODULES;
        let data = [];

        search.create({
            id, type,
            filters: ['isinactive', 'is', false],
            columns: [{name: valueColumnName}, {name: textColumnName}]
        }).run().each(result => {
            data.push({value: result['getValue'](valueColumnName), title: result['getValue'](textColumnName)});
            return true;
        });

        _writeResponseJson(response, data);
    },
    'getPostalLocationOptions' : function (response, {postalStateId}) {
        _writeResponseJson(response, _utils.findLocationByFilters([
            ["isinactive","is","F"],
            "AND",
            ["custrecord_noncust_location_type","anyof","17","18","19","20","21","22","23","9","2","1","7"],
            "AND",
            ['custrecord_ap_lodgement_site_state', 'is', postalStateId]
        ]));
    },
    'getProductPricing' : function (response, {customerId}) {
        let {search} = NS_MODULES;
        let data = [];
        let columns = [
            'internalid',
            'custrecord_prod_pricing_delivery_speeds',
            'custrecord_prod_pricing_pricing_plan',
            'custrecord_prod_pricing_def_prod_type',
            'custrecord_prod_pricing_b4',
            'custrecord_prod_pricing_250g',
            'custrecord_prod_pricing_500g',
            'custrecord_prod_pricing_1kg',
            'custrecord_prod_pricing_3kg',
            'custrecord_prod_pricing_5kg',
            'custrecord_prod_pricing_10kg',
            'custrecord_prod_pricing_20kg',
            'custrecord_prod_pricing_25kg',
            'custrecord_sycn_complete',
        ];

        search.create({
            type: "customrecord_product_pricing",
            filters:
              [
                  ["isinactive", "is", "F"],
                  "AND",
                  ["custrecord_prod_pricing_carrier_last_mil", "noneof", "1"],
                  "AND",
                  ["custrecord_prod_pricing_status", "noneof", "@NONE@", "3", "4", "5"],
                  'AND',
                  ['custrecord_prod_pricing_customer', 'is', customerId]
              ],
            columns
        }).run().each(item => {
            let tmp = {};

            for (let column of item.columns) {
                tmp[column.name + '_text'] = item.getText(column);
                tmp[column.name] = item.getValue(column);
            }

            data.push(tmp);

            return true;
        })

        _writeResponseJson(response, data);
    },
    'getMpExWeeklyUsage' : function (response, {customerId}) {
        let {search} = NS_MODULES;
        let data = [];

        let customerSearch = search.load({
            id: 'customsearch_customer_mpex_weekly_usage',
            type: 'customer'
        });

        customerSearch.filters.push(search.createFilter({
            name: 'internalid',
            operator: search.Operator.IS,
            values: customerId
        }));

        customerSearch.run().each(item => {
            let weeklyUsage = item.getValue('custentity_actual_mpex_weekly_usage');

            let parsedUsage = JSON.parse(weeklyUsage);

            for (let x = 0; x < parsedUsage['Usage'].length; x++) {
                let parts = parsedUsage['Usage'][x]['Week Used'].split('/');

                data.push({
                    col1: parts[2] + '-' + ('0' + parts[1]).slice(-2) + '-' + ('0' + parts[0]).slice(-2),
                    col2: parsedUsage['Usage'][x]['Count']
                })
            }

            return true;
        })

        _writeResponseJson(response, data);
    },
    'getServiceChanges' : function (response, {customerId, commRegId}) {
        if (!customerId) return _writeResponseJson(response, {error: `Invalid Customer ID: ${customerId}`});

        _writeResponseJson(response, sharedFunctions.getServiceChangeRecords(customerId, commRegId));
    },
    'getSalesCampaignActivities' : function (response, {customerId}) {
        let {search} = NS_MODULES;
        let data = [];
        let columns = ['createddate', 'completeddate', 'type', 'assigned', 'title', 'message', 'custevent_organiser']

        search.create({
            type: 'activity',
            filters: [
                {
                    name: 'company',
                    operator: search.Operator.ANYOF,
                    values: customerId
                }
            ],
            columns: columns.map(item => ({name: item}))
        }).run().each(result => {
            let tmp = {};

            for (let fieldId of columns) {
                tmp[fieldId] = result.getValue(fieldId);
                tmp[fieldId + '_text'] = result.getText(fieldId);
            }

            data.push(tmp);

            return true;
        });


        search.create({
            type: search.Type.NOTE,
            filters: [
                {
                    name: 'internalid',
                    join: 'CUSTOMER',
                    operator: search.Operator.IS,
                    values: customerId
                },
            ],
            columns: ['title', 'note', 'author', 'notedate',]
        }).run().each(item => {
            data.push({
                'createddate': item.getValue('notedate'),
                'completeddate': item.getValue('notedate'),
                'type': 'note',
                'assigned': null, 'title': item.getValue('title'), 'message': item.getValue('note'),
                'custevent_organiser_text': item.getText('author'),
            });

            return true;
        })

        _writeResponseJson(response, data);
    },
    'getCommencementRegister' : function (response, {customerId, salesRecordId, fieldIds}) {
        let {record, search} = NS_MODULES;
        let data = [];

        let customerRecord = record.load({type: 'customer', id: customerId});
        let customerStatus = customerRecord.getValue({fieldId: 'entitystatus'});

        search.create({
            type: 'customrecord_commencement_register',
            filters: [
                {name: 'custrecord_customer', operator: search.Operator.IS, values: parseInt(customerId)},
                {name: 'custrecord_commreg_sales_record', operator: search.Operator.IS, values: parseInt(salesRecordId)},
                {
                    name: 'custrecord_trial_status',
                    operator: search.Operator.ANYOF, // include Signed (2) only if customer status is To Be Finalised (66)
                    values: parseInt(customerStatus) === 66 ? [2, 9, 10] : [9, 10]
                },
            ],
            columns: fieldIds.map(item => ({name: item}))
        }).run().each(result => {
            let tmp = {};

            for (let fieldId of fieldIds) {
                tmp[fieldId] = result.getValue(fieldId);
                tmp[fieldId + '_text'] = result.getText(fieldId);
            }

            data.push(tmp);

            return true;
        });

        _writeResponseJson(response, data);
    },
    'getFileURLById' : function (response, {fileId}) {
        let {file} = NS_MODULES;

        let fileObj = file.load({id: fileId});

        _writeResponseJson(response, {fileURL: fileObj.url});
    },
    'getSalesRecord' : function (response, {salesRecordId, fieldIds}) {
        let salesRecord = NS_MODULES.record.load({type: 'customrecord_sales', id: salesRecordId});
        let tmp = {};

        for (let fieldId of fieldIds)
            tmp[fieldId] = salesRecord.getValue({fieldId});

        _writeResponseJson(response, tmp);
    },
    'getFranchiseesOfLPOProject' : function (response) {
        let data = [];
        NS_MODULES.search.create({ // customsearch_parent_lpo_customers
            type: "customer",
            filters:
              [
                  ["status","anyof","13"],
                  "AND",
                  ["companyname","contains","LPO - Parent"],
                  "AND",
                  ["parentcustomer.internalid","anyof","@NONE@"],
                  // "AND",
                  // ["leadsource","anyof","281559"]
              ],
            columns: ['internalid', 'entityid', 'companyname', 'custentity_lpo_linked_franchisees']
        }).run().each(result => {
            let franchiseeIds = result.getValue('custentity_lpo_linked_franchisees').split(',');

            for (let franchiseeId of franchiseeIds) {
                let tmp = {};

                for (let column of result.columns)
                    tmp[column.name] = result.getValue(column.name);

                tmp['custentity_lpo_linked_franchisees'] = franchiseeId;

                data.push(tmp);
            }

            return true;
        });

        _writeResponseJson(response, data);
    },
    'getPhotosOfBusiness' : function (response, {customerId}) {
        let data = [];

        NS_MODULES.search.create({
            type: 'file',
            filters: [
                ['name', 'contains', customerId], 'AND',
                ['folder', 'is', 3819984]
            ],
            columns: ['name', 'url']
        }).run().each(resultSet => {
            data.push({
                name: resultSet.getValue({ name: 'name' }),
                url: resultSet.getValue({ name: 'url' }),
                id: resultSet.id
            });

            return true;
        });

        _writeResponseJson(response, data);
    },
    'checkPortalStatusOfContactEmail' : function (response, {contactId}) {
        let {record, https} = NS_MODULES;
        let contactRecord = record.load({type: 'contact', id: contactId});
        let contactEmail = contactRecord.getValue({fieldId: 'email'});
        let mainURL = 'https://mpns.protechly.com/outbound_emails?email=' + contactEmail;

        let headers = {};
        headers['Content-Type'] = 'application/json';
        headers['Accept'] = 'application/json';
        headers['x-api-key'] = 'XAZkNK8dVs463EtP7WXWhcUQ0z8Xce47XklzpcBj';

        let res = https.get({
            url: mainURL,
            body: null,
            headers
        });
        let emailSubjects;

        try {
            emailSubjects = JSON.parse(res.body);
        } catch (e) {
            return _writeResponseJson(response, {error: `Could not retrieve information for contact email: ${contactEmail}`});
        }

        let createPasswordEmailSent = Array.isArray(emailSubjects) ?
          emailSubjects.filter(item => item?.subject.includes('Your MailPlus shipping portal is now ready for you to set up.')).length > 0 : false;

        let accountActivated = Array.isArray(emailSubjects) ?
          emailSubjects.filter(item => item?.subject.includes('Welcome to your MailPlus Shipping Portal.')).length > 0 : false;

        _writeResponseJson(response, {accountActivated, createPasswordEmailSent});
    },
}

const postOperations = {
    'verifyParameters' : function (response, {customerId, salesRecordId = null} = {}) {
        let {record, runtime} = NS_MODULES;

        if (salesRecordId) {
            let salesRecord = record.load({type: 'customrecord_sales', id: salesRecordId, isDynamic: true});

            if (parseInt(salesRecord.getValue({fieldId: 'custrecord_sales_customer'})) === parseInt(customerId))
                _writeResponseJson(response, {
                    customerId: parseInt(customerId),
                    salesRecordId: parseInt(salesRecordId),
                    userId: runtime['getCurrentUser']().id,
                    userRole: runtime['getCurrentUser']().role,
                });
            else _writeResponseJson(response, {error: `IDs mismatched. Sales record #${salesRecordId} does not belong to customer #${customerId}.`});
        } else _writeResponseJson(response, {
            customerId,
            salesRecordId: null,
            userId: runtime['getCurrentUser']().id,
            userRole: runtime['getCurrentUser']().role,
        });
    },
    'setAsOutOfTerritory' : function (response, {customerId, salesRecordId}) {
        let {record} = NS_MODULES;
        let salesRecord = record.load({type: 'customrecord_sales', id: salesRecordId, isDynamic: true});
        let customerRecord = record.load({type: 'customer', id: customerId, isDynamic: true});
        let today = _getTodayDateObjectForDateField();

        customerRecord.setValue({fieldId: 'entitystatus', value: 64}); // SUSPECT - Out of Territory (64)
        customerRecord.setValue({fieldId: 'custentity_service_cancellation_reason', value: 39}); // Unserviceable Territory (39)
        customerRecord.setValue({fieldId: 'custentity_service_cancelled_on', value: today});

        salesRecord.setValue({fieldId: 'custrecord_sales_completed', value: true});
        salesRecord.setValue({fieldId: 'custrecord_sales_completedate', value: today});

        customerRecord.save({ignoreMandatoryFields: true});
        salesRecord.save({ignoreMandatoryFields: true});

        _writeResponseJson(response, 'Customer set as [Out of Territory]');
    },
    'saveCustomerDetails' : function (response, {customerId, customerData, fieldIds}) {
        if (!customerId) throw `Invalid or missing Customer ID: [${customerId}]`;

        sharedFunctions.saveCustomerData(customerId, customerData);

        _writeResponseJson(response, sharedFunctions.getCustomerData(customerId, fieldIds));
    },
    'saveAddress' : function (response, {customerId, addressArray}) {
        for (let addressData of addressArray)
            sharedFunctions.saveCustomerAddress(customerId, addressData);

        _writeResponseJson(response, 'Address Saved!');
    },
    'deleteAddress' : function (response, {customerId, addressInternalId}) {
        let {record} = NS_MODULES;

        let customerRecord = record.load({
            type: record.Type.CUSTOMER,
            id: customerId,
        });
        let line = customerRecord['findSublistLineWithValue']({sublistId: 'addressbook', fieldId: 'internalid', value: addressInternalId});

        customerRecord['removeLine']({sublistId: 'addressbook', line});

        customerRecord.save({ignoreMandatoryFields: true});

        _writeResponseJson(response, 'Address Deleted!');
    },
    'saveContact' : function (response, {customerId, contactData}) {
        if (!contactData) return _writeResponseJson(response, {error: `Missing params [contactData]: ${contactData}`});

        sharedFunctions.saveCustomerContact(customerId, contactData);

        _writeResponseJson(response, 'Contact Saved!');
    },
    'setContactAsInactive' : function (response, {contactInternalId}) {
        if (!contactInternalId) return _writeResponseJson(response, {error: `Missing params [contactInternalId]: ${contactInternalId}`});

        let {record} = NS_MODULES;

        let contactRecord = record.load({
            type: record.Type.CONTACT,
            id: contactInternalId,
        });

        contactRecord.setValue({fieldId: 'isinactive', value: true});

        contactRecord.save({ignoreMandatoryFields: true});

        _writeResponseJson(response, 'Contact Delete!');
    },
    'createSalesNote' : function (response, {customerId, salesRecordId, salesNote}) {
        if (salesNote) {
            let {record} = NS_MODULES;
            let salesRecord = record.load({type: 'customrecord_sales', id: salesRecordId, isDynamic: true});
            let salesCampaignId = salesRecord.getValue({fieldId: 'custrecord_sales_campaign'});
            let salesCampaignRecord = record.load({type: 'customrecord_salescampaign', id: salesCampaignId, isDynamic: true});

            let id = _createUserNote(customerId, salesCampaignRecord.getValue({fieldId: 'name'}) + ' - Call Notes', salesNote);

            NS_MODULES.log.debug('createSalesNote', `phoneCallRecord saved user note with id ${id}`)
            _writeResponseJson(response, `Sales Note saved`);
        } else {
            NS_MODULES.log.debug('createSalesNote', `No Sales Note was submitted`)
            _writeResponseJson(response, {error: `No Sales Note was submitted`});
        }
    },
    'handleCallCenterOutcomes' : function (response, {userId, customerId, salesRecordId, salesNote, localUTCOffset, outcome}) {
        let localTime = _getLocalTimeFromOffset(localUTCOffset);

        if (!handleCallCenterOutcomes[outcome])
            _writeResponseJson(response, {error: `Outcome [${outcome}] is not recognised.`});
        else {
            let {record} = NS_MODULES;
            let customerRecord = record.load({type: record.Type.CUSTOMER, id: customerId, isDynamic: true});
            let salesRecord = record.load({type: 'customrecord_sales', id: salesRecordId, isDynamic: true});
            let salesCampaignId = salesRecord.getValue({fieldId: 'custrecord_sales_campaign'});
            let salesCampaignRecord = record.load({type: 'customrecord_salescampaign', id: salesCampaignId, isDynamic: true});

            let phoneCallRecord = record.create({ type: record.Type['PHONE_CALL'], isDynamic: true });
            phoneCallRecord.setValue({fieldId: 'assigned', value: customerRecord.getValue({fieldId: 'partner'})});
            phoneCallRecord.setValue({fieldId: 'custevent_organiser', value: userId});
            phoneCallRecord.setValue({fieldId: 'startdate', value: new Date()});
            phoneCallRecord.setValue({fieldId: 'enddate', value: new Date()});
            phoneCallRecord.setValue({fieldId: 'company', value: customerId});
            phoneCallRecord.setText({fieldId: 'status', text: 'Completed'});
            phoneCallRecord.setValue({fieldId: 'custevent_call_type', value: 2}); // Sales Pitch

            handleCallCenterOutcomes[outcome]({userId, customerRecord, salesRecord, salesCampaignRecord, phoneCallRecord, salesNote, localTime});

            customerRecord.save({ignoreMandatoryFields: true});
            phoneCallRecord.save({ignoreMandatoryFields: true});
            salesRecord.save({ignoreMandatoryFields: true});

            _writeResponseJson(response, `Call center outcome [${outcome}] has been handled.`);
        }
    },
    'convertLeadToLPO' : function (response, {customerId, salesRecordId}) {
        let salesRecordData = {
            custrecord_sales_customer: customerId,
            custrecord_sales_campaign: 69, // LPO (69)
            custrecord_sales_assigned: NS_MODULES.runtime['getCurrentUser']().id,
            custrecord_sales_outcome: 20, // Assigned
            custrecord_sales_callbackdate: new Date(),
            custrecord_sales_callbacktime: new Date(),
        }

        sharedFunctions.markSalesRecordAsCompleted(salesRecordId);

        _writeResponseJson(response, sharedFunctions.createSalesRecord(salesRecordData));
    },
    'convertLeadToBAU' : function (response, {customerId, salesRecordId}) {
        let customerRecord = NS_MODULES.record.load({type: 'customer', id: customerId});
        let leadSource = parseInt(customerRecord.getValue({fieldId: 'leadsource'}));
        let salesRecordData = {
            custrecord_sales_customer: customerId,
            // if lead source is Inbound - Web (99417) then campaign is Digital Lead Campaign (67) otherwise Field Sales (62)
            custrecord_sales_campaign: leadSource === 99417 ? 69 : 62,
            custrecord_sales_assigned: NS_MODULES.runtime['getCurrentUser']().id,
            custrecord_sales_outcome: 20, // Assigned
            custrecord_sales_callbackdate: new Date(),
            custrecord_sales_callbacktime: new Date(),
        }

        sharedFunctions.markSalesRecordAsCompleted(salesRecordId);

        _writeResponseJson(response, sharedFunctions.createSalesRecord(salesRecordData));
    },
    'resendCreatePortalPasswordEmail' : function (response, {customerId, contactId})    {
        let {record, task, log} = NS_MODULES;

        let contactRecord = record.load({
            type: 'contact',
            id: contactId,
        });

        let params = {
            custscript_cust_internal_id: parseInt(customerId),
            custscript_contact_internal_id: parseInt(contactId),
            custscript_contact_fname: contactRecord.getValue({fieldId: 'firstname'}),
            custscript_conatct_lname: contactRecord.getValue({fieldId: 'lastname'}),
            custscript_contact_email: contactRecord.getValue({fieldId: 'email'}),
            custscript_contact_phone: contactRecord.getValue({fieldId: 'phone'}),
        };

        try {
            let scriptTask = task.create({
                taskType: task['TaskType']['SCHEDULED_SCRIPT'],
                scriptId: 'customscript_ss_send_portal_password_ema',
                deploymentId: 'customdeploy1',
                params
            });
            scriptTask.submit();
        } catch (e) { log.debug({title: 'resendCreatePortalPasswordEmail', details: `${e}`}); }

        _writeResponseJson(response, 'Email sent!');
    },
    'sendGiftBoxRequest' : function (response, {customerId}) {
        let contact = sharedFunctions.getCustomerContacts(customerId).filter(item => parseInt(item['contactrole']) === -10)[0]; // Primary Contact
        let address = sharedFunctions.getCustomerAddresses(customerId).filter(item => item['label'] === 'Site Address')[0];

        if (!contact) return _writeResponseJson(response, {error: `Customer ${customerId} has no Primary Contact`});
        if (!address) return _writeResponseJson(response, {error: `Customer ${customerId} has no Site Address`});

        let customerRecord = NS_MODULES.record.load({type: 'customer', id: customerId});
        let entityId = customerRecord.getValue({fieldId: 'entityid'});
        let companyName = customerRecord.getValue({fieldId: 'companyname'});

        let emailBody = `Customer Internal ID: ${customerId} </br>`;
        emailBody += `Customer Name: ${entityId} ${companyName}</br>`;
        emailBody += `Franchisee: ${customerRecord['getText']({fieldId: 'partner'})}</br>`;
        emailBody += `Address: ${address.addr1} ${address.addr2}, ${address.city} ${address.state} ${address.zip}</br>`;
        emailBody += `Contact: ${contact.firstname} ${contact.lastname} (${contact.phone} - ${contact.email})</br>`;

        NS_MODULES.email.send({
            author: 112209,
            subject: 'Gift Box Required - ' + entityId + ' ' + companyName,
            body: emailBody,
            recipients: ['alexandra.bathman@mailplus.com.au', 'maddilon.campos@mailplus.com.au'],
            relatedRecords: {
                'entityId': customerId
            },
        });

        _writeResponseJson(response, 'Email requesting for gift box has been sent!');
    },
    'sendTncSmsToContact' : function (response, {customerId, phoneNumber}) {
        let formattedPhoneNumber = phoneNumber.replace(/^(\+61)/gi, '0');
        formattedPhoneNumber = formattedPhoneNumber.replace(/\D/gi, '');

        if (!/^04[0-9]{8}$/.test(formattedPhoneNumber)) throw `[${phoneNumber}] is not a valid mobile phone number.`

        let tncUrl = `https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=1840&deploy=1&compid=1048144&h=374970ce5575b3b56d7e&custinternalid=${customerId}`;

        let tncShortUrl = _utils.shortenUrl(tncUrl, `T&C Link for Customer #${customerId}`);

        let message = `Hey there! It's MailPlus here. We're excited to get your services started. Please click the link to accept our T&Cs: ${tncShortUrl}. Thank you for trusting us with your business' parcels and mail. Have a great day ahead!`;

        _utils.sendSMS(formattedPhoneNumber, message);

        _writeResponseJson(response, `SMS sent to ${phoneNumber}.`);
    },
    'notifyITTeam' : function (response, {customerId, salesRecordId}) {
        let {record, search, email} = NS_MODULES;

        let customerRecord = record.load({type: record.Type.CUSTOMER, id: customerId});
        let entityId = customerRecord.getValue({fieldId: 'entityid'});
        let companyName = customerRecord.getValue({fieldId: 'companyname'});
        let commRegColumns = [
            'internalId',
            'custrecord_date_entry',
            'custrecord_sale_type',
            'custrecord_franchisee',
            'custrecord_comm_date',
            'custrecord_in_out',
            'custrecord_customer',
            'custrecord_trial_status',
            'custrecord_comm_date_signup',
        ];
        let commRegId;

        if (salesRecordId) { // Search for Commencement Register
            search.create({
                type: 'customrecord_commencement_register',
                filters: [
                    {name: 'custrecord_customer', operator: search.Operator.IS, values: parseInt(customerId)},
                    {name: 'custrecord_commreg_sales_record', operator: search.Operator.IS, values: parseInt(salesRecordId)},
                    {name: 'custrecord_trial_status', operator: search.Operator.ANYOF, values: [9, 10, 2]}, // Scheduled, Quote, or Signed
                ],
                columns: commRegColumns.map(item => ({name: item}))
            }).run().each(result => {
                if (!commRegId) commRegId = result.getValue('internalid');

                if (parseInt(result.getValue('custrecord_trial_status')) === 9)
                    commRegId = result.getValue('internalid');

                return true;
            });
        }

        let serviceChangeCount = 0;
        let emailBody = 'Customer Internal ID: ' + customerId + '</br>'
        emailBody += 'Customer Entity ID: ' + entityId + '</br>'
        emailBody += 'Customer Name: ' + companyName + '</br>'

        if (commRegId) {
            search.create({
                id: 'customsearch_salesp_service_chg',
                type: 'customrecord_servicechg',
                filters: [
                    {name: 'custrecord_service_customer', join: 'CUSTRECORD_SERVICECHG_SERVICE', operator: search.Operator.IS, values: parseInt(customerId)},
                    {name: 'custrecord_servicechg_comm_reg', operator: search.Operator.IS, values: parseInt(commRegId)},
                    {name: 'custrecord_servicechg_status', operator: search.Operator.ANYOF, values: [1, 2, 4]}, // Scheduled, Active or Quote
                ],
                columns: [
                    {name: 'custrecord_servicechg_service'},
                    {name: 'custrecord_service_price', join: "CUSTRECORD_SERVICECHG_SERVICE"},
                    {name: 'custrecord_servicechg_new_price'},
                    {name: 'custrecord_servicechg_date_effective'},
                    {name: 'custrecord_servicechg_type'},
                    {name: 'custrecord_servicechg_new_freq'},
                ]
            }).run().each(result => {
                serviceChangeCount++;

                let serviceText = result.getText('custrecord_servicechg_service');
                let oldServicePrice = result.getValue({name: "custrecord_service_price", join: "CUSTRECORD_SERVICECHG_SERVICE"});
                let newServiceChangePrice = result.getValue('custrecord_servicechg_new_price');
                let dateEffective = result.getValue('custrecord_servicechg_date_effective');
                let serviceChangeTypeText = result.getValue('custrecord_servicechg_type');
                let serviceChangeFreqText = result.getText('custrecord_servicechg_new_freq');

                emailBody += 'Service Name: ' + serviceText + '</br>';
                emailBody += 'Service Change Type: ' + serviceChangeTypeText + '</br>';
                emailBody += 'Date Effective: ' + dateEffective + '</br>';
                emailBody += 'Old Price: ' + oldServicePrice + '</br>';
                emailBody += 'New Price: ' + newServiceChangePrice + '</br>';
                emailBody += 'Frequency: ' + serviceChangeFreqText + '</br>';

                return true;
            });
        }

        if (serviceChangeCount > 0)
            email.send({
                author: 668712,
                subject: 'Cancel Customer - ' + entityId + ' ' + companyName,
                body: emailBody,
                recipients: ['popie.popie@mailplus.com.au', 'fiona.harrison@mailplus.com.au'],
                cc: ['ankith.ravindran@mailplus.com.au', 'tim.nguyen@mailplus.com.au'],
            });

        _writeResponseJson(response, {commRegId, serviceChangeCount});
    },
    'saveCommencementRegister' : function (response, {userId, customerId, salesRecordId, commRegData, servicesChanged, proceedWithoutServiceChanges, localUTCOffset, fileContent, fileName}) {
        let {log, file, record, search, task} = NS_MODULES;
        let customerRecord = record.load({type: record.Type.CUSTOMER, id: customerId});
        let salesRecord = record.load({type: 'customrecord_sales', id: salesRecordId});
        let partnerId = parseInt(customerRecord.getValue({fieldId: 'partner'}));
        let partnerRecord = record.load({type: 'partner', id: partnerId});
        let localTime = _getLocalTimeFromOffset(localUTCOffset);
        let salesRepId = salesRecord.getValue({fieldId: 'custrecord_sales_assigned'}) || userId;

        // Save the uploaded pdf file and get its ID only when fileContent and fileName are present
        if (fileContent && fileName) {
            let formFileId = null;
            let fileExtension = fileName.split('.').pop().toLowerCase();

            if (fileExtension === 'pdf') {
                let dateStr = localTime.toLocaleDateString('en-AU');
                let entityId = customerRecord.getValue({fieldId: 'entityid'});

                formFileId = file.create({
                    name: `${dateStr}_${entityId}.${fileExtension}`,
                    fileType: file.Type['PDF'],
                    contents: fileContent,
                    folder: 1212243,
                }).save();

                commRegData['custrecord_scand_form'] = formFileId;
            } else log.debug({title: "saveCommencementRegister", details: `fileExtension: ${fileExtension}`});
        }

        // Save the commencement register record
        let commRegRecord = commRegData.internalid ?
          record.load({type: 'customrecord_commencement_register', id: commRegData.internalid}) :
          record.create({type: 'customrecord_commencement_register'});

        // remove the Z in the ISO string to prevent time shifting due to timezone difference
        commRegData['custrecord_date_entry'] = new Date((commRegData['custrecord_date_entry'] + '').replace(/[Z,z]/gi, ''));
        commRegData['custrecord_comm_date'] = new Date((commRegData['custrecord_comm_date'] + '').replace(/[Z,z]/gi, ''));
        commRegData['custrecord_comm_date_signup'] = new Date((commRegData['custrecord_comm_date_signup'] + '').replace(/[Z,z]/gi, ''));
        commRegData['custrecord_finalised_on'] = new Date((commRegData['custrecord_finalised_on'] + '').replace(/[Z,z]/gi, ''));
        commRegData['custrecord_salesrep'] = salesRepId;

        for (let fieldId in commRegData)
            commRegRecord.setValue({fieldId, value: commRegData[fieldId]});

        let commRegId = commRegRecord.save({ignoreMandatoryFields: true});

        // Modify service change records
        search.create({
            id: 'customsearch_salesp_service_chg',
            type: 'customrecord_servicechg',
            filters: [
                {name: 'custrecord_service_customer', join: 'CUSTRECORD_SERVICECHG_SERVICE', operator: search.Operator.IS, values: parseInt(customerId)},
                {name: 'custrecord_servicechg_comm_reg', operator: search.Operator.IS, values: commRegId},
                {name: 'custrecord_servicechg_status', operator: search.Operator.NONEOF, values: [2, 3]}, // Active or Ceased
            ],
            columns: [{name: 'internalid'}]
        }).run().each(result => {

            let serviceChangeRecord = record.load({type: 'customrecord_servicechg', id: result.getValue('internalid')});

            serviceChangeRecord.setValue({fieldId: 'custrecord_servicechg_status', value: 1}); // Scheduled

            serviceChangeRecord.save({ignoreMandatoryFields: true});

            return true;
        });

        // Modify sales record
        salesRecord.setValue({fieldId: 'custrecord_sales_outcome', value: 2});
        salesRecord.setValue({fieldId: 'custrecord_sales_completed', value: true});
        salesRecord.setValue({fieldId: 'custrecord_sales_inuse', value: false});
        salesRecord.setValue({fieldId: 'custrecord_sales_commreg', value: commRegId});
        salesRecord.setValue({fieldId: 'custrecord_sales_completedate', value: localTime});
        salesRecord.save({ignoreMandatoryFields: true});

        // Modify customer record
        customerRecord.setValue({fieldId: 'custentity_date_prospect_opportunity', value: localTime});
        customerRecord.setValue({fieldId: 'custentity_cust_closed_won', value: true});
        customerRecord.setValue({fieldId: 'custentity_mpex_surcharge_rate', value: defaultValues.expressFuelSurcharge}); // TOLL surcharge rate
        customerRecord.setValue({fieldId: 'custentity_sendle_fuel_surcharge', value: defaultValues.standardFuelSurcharge});
        customerRecord.setValue({fieldId: 'custentity_mpex_surcharge', value: 1});

        // check if this customer has service fuel surcharge set to anything other than No (2) and Not Included (3)
        if (![2, 3].includes(parseInt(customerRecord.getValue({fieldId: 'custentity_service_fuel_surcharge'})))) {
            customerRecord.setValue({fieldId: 'custentity_service_fuel_surcharge', value: 1});
            customerRecord.setValue({
                fieldId: 'custentity_service_fuel_surcharge_percen', // Service Fuel Surcharge
                // customers associated with Blacktown and Surry Hills get special rates
                value: (partnerId === 218 || partnerId === 469) ? '5.3' : defaultValues.serviceFuelSurcharge
            });
        } else if ([2].includes(parseInt(customerRecord.getValue({fieldId: 'custentity_service_fuel_surcharge'}))))
            customerRecord.setValue({fieldId: 'custentity_service_fuel_surcharge_percen', value: null});

        // Activate MP Standard based on the associated Franchisee
        if (parseInt(partnerRecord.getValue({fieldId: 'custentity_zee_mp_std_activated'})) === 1)
            customerRecord.setValue({fieldId: 'custentity_mp_std_activate', value: 1}); // Activate MP Standard Pricing

        // Get the customer's status before we save, will be used to determine if we want to send email to franchisee or not
        let customerStatus = parseInt(customerRecord.getValue({fieldId: 'entitystatus'}));
        customerRecord.save({ignoreMandatoryFields: true});

        if (proceedWithoutServiceChanges || servicesChanged) {
            log.debug({title: 'saveCommencementRegister', details: `Starting final steps....`});

            // Send this only if customer status going from To be finalised (66) to Signed (13)
            if (customerStatus === 66) {
                log.debug({title: 'saveCommencementRegister', details: `sending email to franchisee`});
                _sendEmailToFranchisee(customerId, partnerId, commRegData['custrecord_comm_date']);
            }

            log.debug({title: 'saveCommencementRegister', details: `sending emails`});
            _sendEmailsAfterSavingCommencementRegister(userId, customerId);

            log.debug({title: 'saveCommencementRegister', details: `syncing product pricing`});
            _checkAndSyncProductPricing(customerId, partnerRecord);

            // Schedule Script to create / edit / delete the financial tab items with the new details
            // This needs to run before customer's status change to Signed (13)
            let {params, pricing_notes_services} = _getScheduledScripParamsAndPricingNotes(customerId, commRegId);

            // Now that email to franchisee is sent, we set customer's status to Signed (13)
            if (customerStatus !== 32) // if status is not Customer-free trial
                record.submitFields({type: 'customer', id: customerId, values: {'entitystatus': 13}});
            record.submitFields({type: 'customer', id: customerId, values: {'custentity_customer_pricing_notes': pricing_notes_services}});

            try {
                log.debug({title: 'saveCommencementRegister', details: `running scheduled script`});
                let scriptTask = task.create({
                    taskType: task.TaskType['SCHEDULED_SCRIPT'],
                    scriptId: 'customscript_sc_smc_item_pricing_update',
                    deploymentId: 'customdeploy1',
                    params
                });
                scriptTask.submit();
            } catch (e) { log.debug({title: '_getScheduledScripParamsAndPricingNotes', details: `${e}`}); }
        } else log.debug({title: 'saveCommencementRegister', details: `Final steps skipped.`});

        // End
        _writeResponseJson(response, {commRegId});
    },

    'changePortalAccess' : function (response, {customerId, portalAccess, changeNotes, date}) {
        let {record, runtime, email, task} = NS_MODULES;

        if (changeNotes) _createUserNote(customerId, `Portal Access Change`, changeNotes)

        if (![1, 2].includes(parseInt(portalAccess))) return _writeResponseJson(response, '');

        portalAccess = parseInt(portalAccess);

        let customerFields = NS_MODULES.search['lookupFields']({
            type: 'customer',
            id: customerId,
            columns: ['entityId', 'companyName', 'internalId', 'partner', 'partner.email', 'custentity_portal_access', 'custentity_mp_toll_salesrep.email']
        });

        record['submitFields']({type: 'customer', id: customerId, values: {'custentity_portal_access': portalAccess}});

        if (date) record['submitFields']({type: 'customer', id: customerId, values: {'custentity_portal_access_date': new Date(date.replace(/[Z,z]/gi, ''))}});
        if (portalAccess === 1) record['submitFields']({type: 'customer', id: customerId, values: {'custentity_mpex_invoicing_cycle': 2}}); // Weekly Invoicing Cycle (2)

        if (parseInt(customerFields?.['custentity_portal_access']?.[0]?.['value']) === portalAccess)
            return _writeResponseJson(response, '');

        let lookup = {
            1: {
                status: 'YES',
                scriptId: 'customscript_ss_bulk_sync_prod_pricing',
                deploymentId: 'customdeploy2',
                subject: `Resumption of Parcel Collection from ${customerFields['companyName']}`,
                body: `Dear <b>${customerFields['partner'][0]['text']}</b>,<br><br>`
                    + `I am pleased to inform you that the outstanding debt issues with <b>${customerFields['companyName']}</b> have been fully resolved. We appreciate your patience and understanding during the temporary suspension of services.<br><br>`
                    + `Effective immediately, you may resume all parcel collection activities from <b>${customerFields['companyName']}</b>'s location. We are confident that the resolution of this matter will allow for a smooth continuation of our business operations.<br><br>`
                    + `Thank you for your cooperation and the prompt attention you gave to this matter. We look forward to our continued partnership.<br><br>`
                    + `Best regards,<br>`
                    + `${runtime['getCurrentUser']().name}<br>`,
                subject2: `Access to ShipMate - Reactivated`,
                body2: `Dear Customer,<br><br>`
                    + `This is to inform you that access to the "ShipMate" portal has been re-activated.<br><br>`
                    + `Please note that your invoicing cycle has been updated, meaning that you will receive weekly invoices rather than monthly. The reason your invoicing cycle has been updated is to assist in the timely flow of payments following your recent account suspension.<br><br>`
                    + `For assistance, please contact our head office at 1300656595 or email mailto:accounts@mailplus.com.au.<br><br>`
                    + `Warm regards,<br>`
                    + `<b>${runtime['getCurrentUser']().name}</b><br>`
            },
            2: {
                status: 'NO',
                scriptId: 'customscript_ss_bulk_unsync_pord_pricing',
                deploymentId: 'customdeploy2',
                subject: `Immediate Suspension of Parcel Collection from ${customerFields['companyName']}`,
                body: `Dear <b>${customerFields['partner'][0]['text']}</b>,<br><br>`
                    + `I hope this message finds you well. We regret to inform you that due to unresolved financial issues with <b>${customerFields['companyName']}</b>, we must immediately suspend all parcel collection services from their location.<br><br>`
                    + `Despite repeated attempts to resolve the outstanding debt, we have not received satisfactory assurances or payments. As a result, we must take this unfortunate but necessary step to protect our business interests.<br><br>`
                    + `Please cease all collection activities at <b>${customerFields['companyName']}</b>'s premises effective immediately. We will notify you once the situation has been resolved and services can be resumed.<br><br>`
                    + `We apologize for any inconvenience this may cause and appreciate your understanding and cooperation in this matter.<br><br>`
                    + `Thank you for your prompt attention to this urgent issue.<br><br>`
                    + `Best regards,<br>`
                    + `<b>${runtime['getCurrentUser']().name}</b><br>`,
                subject2: `Access to ShipMate - Restricted`,
                body2: `Dear Customer,<br><br>`
                    + `This is to inform you that access to the "ShipMate" portal has been temporarily denied.<br><br>`
                    + `For assistance, please contact our head office at 1300656595 or email mailto:accounts@mailplus.com.au.<br><br>`
                    + `Warm regards,<br>`
                    + `<b>${runtime['getCurrentUser']().name}</b><br>`
            }
        }

        let portalEmailBody = runtime['getCurrentUser']().name + ' has set Portal Access to <b>' + lookup[portalAccess].status + '</b> for the following customer:<br>'
            + `Customer: ${customerFields['entityId']} ${customerFields['companyName']}<br>`
            + `of Franchisee: ${customerFields['partner'][0]['text']}<br>`
            + (changeNotes ? `with the following notes: ${changeNotes}` : `and did not provide any notes.`);

        // Notify the IT team
        email.send({
            author: 112209,
            subject: `[${customerFields['entityId']}][Portal Access = ${lookup[portalAccess].status}][by ${runtime['getCurrentUser']().name}]`,
            body: portalEmailBody,
            recipients: ['portalsupport@mailplus.com.au'],
            relatedRecords: {
                'entityId': customerId
            },
            isInternalOnly: true
        });

        // Notify the franchisee
        email.send({
            author: runtime['getCurrentUser']().id,
            subject: lookup[portalAccess].subject,
            body: lookup[portalAccess].body,
            recipients: [customerFields['partner.email']],
            cc: ['portalsupport@mailplus.com.au', 'customerservice@mailplus.com.au',
                ...(customerFields['custentity_mp_toll_salesrep.email'] ? [customerFields['custentity_mp_toll_salesrep.email']] : [])],
            relatedRecords: {
                'entityId': customerId
            },
            isInternalOnly: true
        });

        try {
            // Notify all contacts
            let contactEmails = sharedFunctions.getCustomerContacts(customerId).map(item => item.email.toLowerCase());
            contactEmails = [...(new Set(contactEmails))];

            email.send({
                author: runtime['getCurrentUser']().id,
                subject: lookup[portalAccess].subject2,
                body: lookup[portalAccess].body2,
                recipients: [contactEmails.shift()],
                bcc: [...contactEmails],
                relatedRecords: {
                    'entityId': customerId
                },
                isInternalOnly: true
            });
        } catch (e) { NS_MODULES.log.debug('changePortalAccess', `Notifying contacts failed. ${e}`); }

        let scriptTask = task.create({
            taskType: task['TaskType']['SCHEDULED_SCRIPT'],
            scriptId: lookup[portalAccess].scriptId,
            deploymentId: lookup[portalAccess].deploymentId,
            params: {
                custscript_prod_pricing_zee_cust_list: customerFields['partner'][0]['value'],
                custscript_prod_pricing_sync_cust_id: customerId,
            }
        });
        scriptTask.submit();
        NS_MODULES.log.debug('changePortalAccess', `scriptId: ${lookup[portalAccess].scriptId}, deploymentId: ${lookup[portalAccess].deploymentId}`)

        _writeResponseJson(response, '');
    },

    'saveBrandNewCustomer' : function (response, {customerData, addressArray, contactArray}) {
        let user = NS_MODULES.runtime['getCurrentUser']();
        // Data preparation
        // Set default fuel surcharges
        customerData['custentity_service_fuel_surcharge'] = 1;
        customerData['custentity_mpex_surcharge'] = 1;
        customerData['custentity_service_fuel_surcharge_percen'] = defaultValues.serviceFuelSurcharge;
        customerData['custentity_mpex_surcharge_rate'] = defaultValues.expressFuelSurcharge;
        customerData['custentity_sendle_fuel_surcharge'] = defaultValues.standardFuelSurcharge;

        customerData['custentity_email_service'] = customerData['custentity_email_service'] || 'abc@abc.com';
        customerData['phone'] = customerData['phone'] || '1300656595';
        customerData['partner'] = customerData['partner'] || 435; // MailPlus Pty Ltd (435)

        customerData['custentity_invoice_method'] = 2; // Invoice method: Email (2) (default)
        customerData['custentity18'] = true; // Exclude from batch printing
        customerData['custentity_invoice_by_email'] = true; // Invoice by email
        customerData['custentity_mpex_small_satchel'] = 1; // Activate MP Express Pricing

        if (user.role !== 1000) // only set this field when the user is not a franchisee
            customerData['custentity_lead_entered_by'] = user.id;

        // Save customer's detail
        let customerId = sharedFunctions.saveCustomerData(null, customerData);

        // Take the field custentity_operation_notes and create a User Note to make it easier for sales team to see.
        if (customerData['custentity_operation_notes']) // only do this if the field exist
            _createUserNote(customerId, user.role === 1000 ? 'Note from franchisee' : `${user.name} - Notes`, customerData['custentity_operation_notes'], user.id)

        // Save address
        for (let addressData of addressArray)
            sharedFunctions.saveCustomerAddress(customerId, {...addressData, internalid: null});

        // Save contact
        for (let contactData of contactArray)
            sharedFunctions.saveCustomerContact(customerId, {...contactData, internalid: null});

        // Create product pricing
        let addressIndex = addressArray.findIndex(item => item.label === 'Site Address');
        let address = addressArray[addressIndex];
        if (address) _createProductPricing(customerId, address.city, address.zip);

        _writeResponseJson(response, customerId);
    },
    'uploadImage' : function (response, {base64FileContent, fileName}) {
        if (base64FileContent && fileName) {
            let {file} = NS_MODULES;
            let fileExtension = fileName.split('.').pop().toLowerCase();
            let extensionList = {
                png: file.Type['PNGIMAGE'],
                jpg: file.Type['JPGIMAGE'],
                jpeg: file.Type['JPGIMAGE'],
                bmp: file.Type['BMPIMAGE'],
                tiff: file.Type['TIFFIMAGE'],
                gif: file.Type['GIFIMAGE'],
            };

            if (extensionList[fileExtension]) {
                file.create({
                    name: fileName,
                    fileType: extensionList[fileExtension],
                    contents: base64FileContent,
                    folder: 3819984, // New Lead Photos folder
                }).save();

                _writeResponseJson(response, 'file uploaded');
            } else _writeResponseJson(response, {error: `Extension [${fileExtension}] not support. `});
        } else _writeResponseJson(response, {error: `no data provided`});
    }
};


const sharedFunctions = {
    getCustomerData(customerId, fieldIds) {
        let {record} = NS_MODULES;
        let data = {};

        let customerRecord = record.load({
            type: record.Type.CUSTOMER,
            id: customerId,
        });

        for (let fieldId of fieldIds) {
            data[fieldId] = customerRecord.getValue({fieldId});
            data[fieldId + '_text'] = customerRecord.getText({fieldId});
        }

        return data;
    },
    getCustomerAddresses(customerId) {
        let {record} = NS_MODULES;
        let data = [];
        let fieldIds = ['addr1', 'addr2', 'city', 'state', 'zip', 'country', 'addressee', 'custrecord_address_lat', 'custrecord_address_lon', 'custrecord_address_ncl'];
        let sublistFieldIds = ['internalid', 'label', 'defaultshipping', 'defaultbilling', 'isresidential'];

        let customerRecord = record.load({
            type: record.Type.CUSTOMER,
            id: customerId,
            isDynamic: true
        });

        let lineCount = customerRecord.getLineCount({sublistId: 'addressbook'});

        for (let line = 0; line < lineCount; line++) {
            customerRecord.selectLine({sublistId: 'addressbook', line});
            let entry = {};

            for (let fieldId of sublistFieldIds) {
                entry[fieldId] = customerRecord.getCurrentSublistValue({sublistId: 'addressbook', fieldId})
            }

            let addressSubrecord = customerRecord.getCurrentSublistSubrecord({sublistId: 'addressbook', fieldId: 'addressbookaddress'});
            for (let fieldId of fieldIds) {
                entry[fieldId] = addressSubrecord.getValue({ fieldId })
            }

            data.push(entry);
        }

        return data;
    },
    getCustomerContacts(customerId) {
        let contactFieldIds = Object.keys(contactFields);
        let data = [];

        NS_MODULES.search.create({
            type: 'contact',
            filters: [
                ["isinactive","is","F"],
                'AND',
                ['customer.internalid', 'anyof', customerId]
            ],
            columns: contactFieldIds,
        }).run().each(result => _utils.processSavedSearchResults(data, result))

        return data;
    },
    getServiceChangeRecords(customerId, commRegId) {
        let {record, search} = NS_MODULES;
        let serviceChangeRecords = [];

        let customerRecord = record.load({type: 'customer', id: customerId});
        let customerStatus = customerRecord.getValue({fieldId: 'entitystatus'});

        let searchObj = search.load({id: 'customsearch_salesp_service_chg', type: 'customrecord_servicechg'});
        searchObj.filters.push(search.createFilter({
            name: 'custrecord_service_customer',
            join: 'CUSTRECORD_SERVICECHG_SERVICE',
            operator: 'anyof',
            values: customerId,
        }));
        searchObj.filters.push(search.createFilter({
            name: 'custrecord_servicechg_comm_reg',
            join: null,
            operator: 'anyof',
            values: commRegId,
        }));
        searchObj.filters.push(search.createFilter({// if customer is To Be Finalised (66), this should only be 3
            name: 'custrecord_servicechg_status',
            join: null,
            operator: 'noneof',
            values: parseInt(customerStatus) === 66 ? [3] : [2, 3], // Active or Ceased
        }));
        searchObj.run().each(result => {
            serviceChangeRecords.push({
                serviceId: result.getValue({name: 'custrecord_servicechg_service'}),
                serviceText: result.getText({name: 'custrecord_servicechg_service'}),
                serviceDescription: result.getValue({name: 'custrecord_service_description', join: 'CUSTRECORD_SERVICECHG_SERVICE'}),
                serviceTypeId: result.getValue({name: 'custrecord_service', join: 'CUSTRECORD_SERVICECHG_SERVICE'}),
                oldServicePrice: result.getValue({name: 'custrecord_service_price', join: 'CUSTRECORD_SERVICECHG_SERVICE'}),
                nsItem: result.getValue({name: 'custrecord_service_ns_item', join: 'CUSTRECORD_SERVICECHG_SERVICE'}),
                newServiceChangePrice: result.getValue({name: 'custrecord_servicechg_new_price'}),
                dateEffective: result.getValue({name: 'custrecord_servicechg_date_effective'}),
                commRegId: result.getValue({name: 'custrecord_servicechg_comm_reg'}),
                serviceChangeTypeText: result.getText({name: 'custrecord_servicechg_type'}),
                serviceChangeFreqText: result.getText({name: 'custrecord_servicechg_new_freq'}),
            });

            return true;
        })

        return serviceChangeRecords;
    },

    saveCustomerData(id, data) {
        let {record} = NS_MODULES;
        let customerRecord;
        let isoStringRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

        if (id) customerRecord = record.load({type: 'customer', id});
        else customerRecord = record.create({type: 'lead'}); // id not present, this is a new lead

        for (let fieldId in data) {
            let value = data[fieldId];
            if (isoStringRegex.test(data[fieldId]) && customerRecord['getField']({fieldId})?.type === 'date')
                value = new Date(data[fieldId].replace(/[Z,z]/gi, ''));
            else if (isoStringRegex.test(data[fieldId]) && customerRecord['getField']({fieldId})?.type === 'datetimetz')
                value = new Date(data[fieldId]);

            customerRecord.setValue({fieldId, value});
        }

        let customerId = customerRecord.save({ignoreMandatoryFields: true});

        if (data['custentity_old_customer']) { // update record of old customer if custentity_old_customer is specified
            let oldCustomerRecord = record.load({type: 'customer', id: data['custentity_old_customer']});

            oldCustomerRecord.setValue({fieldId: 'custentity_new_customer', value: customerId});
            oldCustomerRecord.setValue({fieldId: 'custentity_new_zee', value: data['partner']});

            oldCustomerRecord.save({ignoreMandatoryFields: true});
        }

        return customerId;
    },
    saveCustomerAddress(customerId, addressData) {
        let {record} = NS_MODULES;

        let customerRecord = record.load({
            type: 'customer',
            id: customerId,
            isDynamic: true
        });

        // Safeguard against cases where country is blank which can prevent the record from being saved
        if (Object.hasOwnProperty.call(addressData, 'country') && !addressData['country'])
            addressData['country'] = 'AU';

        // Select an existing or create a new line the customerRecord's sublist
        if (addressData.internalid) { // Edit existing address
            let line = customerRecord['findSublistLineWithValue']({sublistId: 'addressbook', fieldId: 'internalid', value: addressData.internalid});
            customerRecord['selectLine']({sublistId: 'addressbook', line});
        } else { // Save new address
            customerRecord['selectNewLine']({sublistId: 'addressbook'});
        }

        // Fill the sublist's fields using property names of addressSublistFields as reference
        for (let fieldId in addressSublistFields) {
            if (fieldId === 'internalid') continue; // we skip over internalid, not sure if this is necessary
            if (Object.hasOwnProperty.call(addressData, fieldId))
                customerRecord['setCurrentSublistValue']({sublistId: 'addressbook', fieldId, value: addressData[fieldId]});
        }

        // Load the addressbookaddress subrecord of the currently selected sublist line
        let addressSubrecord = customerRecord['getCurrentSublistSubrecord']({sublistId: 'addressbook', fieldId: 'addressbookaddress'});

        // Fill the subrecord's fields using property names of addressFields as reference
        for (let fieldId in addressFields)
            if (Object.hasOwnProperty.call(addressData, fieldId)) addressSubrecord.setValue({fieldId, value: addressData[fieldId]});

        // Commit the line
        customerRecord['commitLine']({sublistId: 'addressbook'});

        // Save customer record
        customerRecord.save({ignoreMandatoryFields: true});
    },
    saveCustomerContact(customerId, contactData) {
        let contactRecord;

        contactData['email'] = contactData['email'] || 'abc@abc.com';

        if (contactData.internalid) contactRecord = NS_MODULES.record.load({type: 'contact', id: contactData.internalid});
        else contactRecord = NS_MODULES.record.create({ type: 'contact' });

        for (let fieldId in contactData)
            contactRecord.setValue({fieldId, value: contactData[fieldId]});

        contactRecord.setValue({fieldId: 'company', value: customerId});

        return contactRecord.save({ignoreMandatoryFields: true});
    },

    markSalesRecordAsCompleted(salesRecordId) {
        let salesRecord = NS_MODULES.record.load({type: 'customrecord_sales', id: salesRecordId});
        salesRecord.setValue({fieldId: 'custrecord_sales_completed', value: true});
        salesRecord.setValue({fieldId: 'custrecord_sales_outcome', value: 16}); // Complete (16)

        return salesRecord.save({ignoreMandatoryFields: true});
    },
    createSalesRecord(salesRecordData) {
        let salesRecord = NS_MODULES.record.create({type: 'customrecord_sales'});

        for (let fieldId in salesRecordData)
            salesRecord.setValue({fieldId, value: salesRecordData[fieldId]});

        return salesRecord.save({ignoreMandatoryFields: true});
    },
};

const handleCallCenterOutcomes = {
    'NO_SALE': ({userId, customerRecord, salesRecord, phoneCallRecord, salesCampaignRecord, salesNote, localTime}) => {
        if (parseInt(salesCampaignRecord.getValue({fieldId: 'custrecord_salescampaign_recordtype'})) !== 65)
            _changeCustomerStatusIfNotSigned(customerRecord, 21)

        phoneCallRecord.setValue({
            fieldId: 'title',
            value: salesCampaignRecord.getValue({fieldId: 'name'}) + ' - No Sale'
        });
        phoneCallRecord.setValue({fieldId: 'message', value: salesNote});
        phoneCallRecord.setValue({fieldId: 'custevent_call_outcome', value: 16});

        salesRecord.setValue({fieldId: 'custrecord_sales_completed', value: true});
        salesRecord.setValue({fieldId: 'custrecord_sales_inuse', value: false});
        salesRecord.setValue({fieldId: 'custrecord_sales_completedate', value: localTime});
        salesRecord.setValue({fieldId: 'custrecord_sales_assigned', value: userId});
        salesRecord.setValue({fieldId: 'custrecord_sales_outcome', value: 10});
        salesRecord.setValue({fieldId: 'custrecord_sales_nosalereason', value: ''});
        salesRecord.setValue({fieldId: 'custrecord_sales_callbackdate', value: ''});
        salesRecord.setValue({fieldId: 'custrecord_sales_callbacktime', value: ''});
        salesRecord.setValue({fieldId: 'custrecord_sales_lastcalldate', value: localTime});
    },
    'NO_ANSWER_EMAIL': ({userId, customerRecord, salesRecord, phoneCallRecord, salesCampaignRecord, salesNote, localTime}) => {
        let {https, record, search, email, runtime, url} = NS_MODULES;
        let customerId = customerRecord.getValue({fieldId: 'id'});
        let customerEmail = customerRecord.getValue({fieldId: 'custentity_email_service'});
        let salesRepId = customerRecord.getValue({fieldId: 'custentity_mp_toll_salesrep'});

        _changeCustomerStatusIfNotSigned(customerRecord, 59); // SUSPECT-Lost
        customerRecord.setValue({fieldId: 'custentity13', value: localTime});
        customerRecord.setValue({fieldId: 'custentity_date_lead_lost', value: localTime});
        customerRecord.setValue({fieldId: 'custentity_service_cancellation_reason', value: 41}); // No Response

        phoneCallRecord.setValue({fieldId: 'message', value: salesNote});
        phoneCallRecord.setValue({fieldId: 'custevent_call_outcome', value: 3}); // Bad Record
        phoneCallRecord.setValue({
            fieldId: 'title',
            value: salesCampaignRecord.getValue({fieldId: 'name'}) + ' - No Answer Email'
        });

        salesRecord.setValue({fieldId: 'custrecord_sales_completed', value: true});
        salesRecord.setValue({fieldId: 'custrecord_sales_inuse', value: false});
        salesRecord.setValue({fieldId: 'custrecord_sales_completedate', value: localTime});
        salesRecord.setValue({fieldId: 'custrecord_sales_outcome', value: 10}); // No Sale
        salesRecord.setValue({fieldId: 'custrecord_sales_assigned', value: userId});
        salesRecord.setValue({fieldId: 'custrecord_sales_callbackdate', value: ''});
        salesRecord.setValue({fieldId: 'custrecord_sales_callbacktime', value: ''});
        salesRecord.setValue({fieldId: 'custrecord_sales_lastcalldate', value: localTime});

        let emailTemplateId = 154;
        let contactId = null;
        let newLeadEmailTemplateRecord = record.load({type: 'customrecord_camp_comm_template', id: emailTemplateId});
        let templateSubject = newLeadEmailTemplateRecord.getValue({fieldId: 'custrecord_camp_comm_subject'});


        search.create({
            type: "contact",
            filters:
              [
                  ["isinactive", "is", "F"],
                  'AND',
                  ["company", "is", customerId],
                  'AND',
                  ['email', 'isnotempty', '']
              ],
            columns: ['internalid']
        }).run().each(item => {contactId = item.id;});

        if (contactId) {
            let httpsGetResult = https.get({
                url: url.format({
                    domain: 'https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl',
                    params: {
                        script: 395,
                        deploy: 1,
                        compid: 1048144,
                        h: '6d4293eecb3cb3f4353e',
                        rectype: 'customer',
                        template: emailTemplateId,
                        recid: customerId,
                        salesrep: salesRepId,
                        dear: null,
                        contactid: contactId,
                        userid: userId,
                    }
                })
            });
            let emailHtml = httpsGetResult.body;

            email.sendBulk({
                author: runtime['getCurrentUser']().role === 1032 ? 112209 : userId,
                body: emailHtml,
                subject: templateSubject,
                recipients: [customerEmail],
                cc: [
                    runtime['getCurrentUser']().email,
                ],
                relatedRecords: {
                    'entityId': customerId
                },
                isInternalOnly: true
            });
        }

        if (parseInt(customerRecord.getValue({fieldId: 'leadsource'})) === -4) // lead generated by zee, informing them of lost lead
            _informFranchiseeOfLostLeadThatTheyEntered(customerRecord, 'No Response - Potentially Bad Record', salesNote);

        _createUserNote(customerId, 'Lead Lost - No Response - Potentially Bad Record', salesNote);
    },
    'NO_ANSWER_PHONE': ({userId, customerRecord, salesRecord, salesCampaignRecord, phoneCallRecord, salesNote, localTime}) => {
        _changeStatusIfNotCustomer(customerRecord, 20); // SUSPECT-No Answer
        if (parseInt(salesCampaignRecord.getValue({fieldId: 'internalid'})) === 55) { // AusPost GPO List - Cleanse
            phoneCallRecord.setValue({fieldId: 'title', value: 'Prospecting Call - GPO - No Answer'});
        } else {

            phoneCallRecord.setValue({fieldId: 'title', value: salesCampaignRecord.getValue({fieldId: 'name'}) + ' - No Answer - Phone Call'});
        }

        if (!salesRecord.getValue({fieldId: 'custrecord_sales_day0call'}))
            salesRecord.setValue({fieldId: 'custrecord_sales_day0call', value: localTime});
        else if (!salesRecord.getValue({fieldId: 'custrecord_sales_day14call'}))
            salesRecord.setValue({fieldId: 'custrecord_sales_day14call', value: localTime});
        else if (!salesRecord.getValue({fieldId: 'custrecord_sales_day25call'}))
            salesRecord.setValue({fieldId: 'custrecord_sales_day25call', value: localTime});

        phoneCallRecord.setValue({fieldId: 'message', value: salesNote});
        phoneCallRecord.setValue({fieldId: 'custevent_call_outcome', value: 6}); // No Contact

        let fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(localTime.getDate() + 5);
        fiveDaysFromNow.setHours(10, 0, 0); // 5 days from now, at 10 am
        salesRecord.setValue({fieldId: 'custrecord_sales_completed', value: false});
        salesRecord.setValue({fieldId: 'custrecord_sales_quotesent', value: false});
        salesRecord.setValue({fieldId: 'custrecord_sales_inuse', value: false});
        salesRecord.setValue({fieldId: 'custrecord_sales_outcome', value: 7}); // No Answer
        salesRecord.setValue({fieldId: 'custrecord_sales_assigned', value: userId});
        salesRecord.setValue({fieldId: 'custrecord_sales_callbackdate', value: fiveDaysFromNow});
        salesRecord.setValue({fieldId: 'custrecord_sales_callbacktime', value: fiveDaysFromNow});
        let attempts = parseInt(salesRecord.getValue({fieldId: 'custrecord_sales_attempt'}));
        salesRecord.setValue({
            fieldId: 'custrecord_sales_attempt',
            value: isNaN(attempts) ? 1 : attempts + 1
        });
    },
    'NO_RESPONSE_EMAIL': ({userId, customerRecord, salesRecord, phoneCallRecord, salesCampaignRecord, salesNote, localTime}) => {
        // let salesCampaignType = parseInt(salesCampaignRecord.getValue({fieldId: 'custrecord_salescampaign_recordtype'}));
        let salesCampaignId = parseInt(salesCampaignRecord.getValue({fieldId: 'internalid'}));

        _changeStatusIfNotCustomer(customerRecord, 20); // SUSPECT-No Answer

        phoneCallRecord.setValue({fieldId: 'message', value: salesNote});
        phoneCallRecord.setValue({fieldId: 'custevent_call_outcome', value: 6}); // No Contact
        phoneCallRecord.setValue({
            fieldId: 'title',
            value: salesCampaignId === 55 ? 'Prospecting Call - GPO - No Answer' : salesCampaignRecord.getValue({fieldId: 'name'}) + ' - No Response - Email'
        });

        if (!salesRecord.getValue({fieldId: 'custrecord_sales_day0call'}))
            salesRecord.setValue({fieldId: 'custrecord_sales_day0call', value: localTime});
        else if (!salesRecord.getValue({fieldId: 'custrecord_sales_day14call'}))
            salesRecord.setValue({fieldId: 'custrecord_sales_day14call', value: localTime});
        else if (!salesRecord.getValue({fieldId: 'custrecord_sales_day25call'}))
            salesRecord.setValue({fieldId: 'custrecord_sales_day25call', value: localTime});

        let fiveDaysFromNow = new Date();
        fiveDaysFromNow.setDate(localTime.getDate() + 5);
        fiveDaysFromNow.setHours(10, 0, 0); // 5 days from now, at 10 am
        salesRecord.setValue({fieldId: 'custrecord_sales_completed', value: false});
        salesRecord.setValue({fieldId: 'custrecord_sales_quotesent', value: false});
        salesRecord.setValue({fieldId: 'custrecord_sales_inuse', value: false});
        salesRecord.setValue({fieldId: 'custrecord_sales_assigned', value: userId});
        salesRecord.setValue({fieldId: 'custrecord_sales_outcome', value: 7}); // No Answer
        salesRecord.setValue({fieldId: 'custrecord_sales_callbackdate', value: fiveDaysFromNow});
        salesRecord.setValue({fieldId: 'custrecord_sales_callbacktime', value: fiveDaysFromNow});
        let attempts = parseInt(salesRecord.getValue({fieldId: 'custrecord_sales_attempt'}));
        salesRecord.setValue({
            fieldId: 'custrecord_sales_attempt',
            value: isNaN(attempts) ? 1 : attempts + 1
        });
    },
    'NOT_ESTABLISHED': ({userId, customerRecord, salesRecord, phoneCallRecord, salesCampaignRecord, salesNote, localTime}) => {
        _changeCustomerStatusIfNotSigned(customerRecord, 59); // SUSPECT-Lost
        customerRecord.setValue({fieldId: 'custentity13', value: localTime});
        customerRecord.setValue({fieldId: 'custentity_date_lead_lost', value: localTime});
        customerRecord.setValue({fieldId: 'custentity_service_cancellation_reason', value: 55}); // Not Established Business

        phoneCallRecord.setValue({fieldId: 'message', value: salesNote});
        phoneCallRecord.setValue({fieldId: 'custevent_call_outcome', value: 3}); // Bad Record
        phoneCallRecord.setValue({
            fieldId: 'title',
            value: salesCampaignRecord.getValue({fieldId: 'name'}) + ' - Not Established Business'
        });

        salesRecord.setValue({fieldId: 'custrecord_sales_completed', value: true});
        salesRecord.setValue({fieldId: 'custrecord_sales_inuse', value: false});
        salesRecord.setValue({fieldId: 'custrecord_sales_completedate', value: localTime});
        salesRecord.setValue({fieldId: 'custrecord_sales_assigned', value: userId});
        salesRecord.setValue({fieldId: 'custrecord_sales_outcome', value: 10}); // No Sale
        salesRecord.setValue({fieldId: 'custrecord_sales_callbackdate', value: ''});
        salesRecord.setValue({fieldId: 'custrecord_sales_callbacktime', value: ''});
        salesRecord.setValue({fieldId: 'custrecord_sales_lastcalldate', value: localTime});

        if (parseInt(customerRecord.getValue({fieldId: 'leadsource'})) === -4) // lead generated by zee, informing them of lost lead
            _informFranchiseeOfLostLeadThatTheyEntered(customerRecord, 'Not An Established Business - Potentially Bad Record', salesNote);

        _createUserNote(customerRecord.getValue({fieldId: 'id'}), 'Lead Lost - Not An Established Business - Potentially Bad Record', salesNote);
    },
    'FOLLOW_UP': ({userId, customerRecord, salesRecord, phoneCallRecord, salesCampaignRecord, salesNote, localTime}) => {
        if (parseInt(salesRecord.getValue({fieldId: 'custrecord_sales_campaign'})) === 69) // if campaign is LPO (69)
            _changeCustomerStatusIfNotSigned(customerRecord, 67); // LPO-Follow-up
        else _changeCustomerStatusIfNotSigned(customerRecord, 18); // SUSPECT-Follow-up

        phoneCallRecord.setValue({fieldId: 'message', value: salesNote});
        phoneCallRecord.setValue({fieldId: 'custevent_call_outcome', value: 25}); // Opportunity
        phoneCallRecord.setValue({
            fieldId: 'title',
            value: salesCampaignRecord.getValue({fieldId: 'name'}) + ' - Prospect Opportunity'
        });

        salesRecord.setValue({fieldId: 'custrecord_sales_completed', value: false});
        salesRecord.setValue({fieldId: 'custrecord_sales_inuse', value: false});
        salesRecord.setValue({fieldId: 'custrecord_sales_assigned', value: userId});
        salesRecord.setValue({fieldId: 'custrecord_sales_outcome', value: 21}); // Opportunity
        salesRecord.setValue({fieldId: 'custrecord_sales_callbackdate', value: ''});
        salesRecord.setValue({fieldId: 'custrecord_sales_callbacktime', value: ''});
        salesRecord.setValue({fieldId: 'custrecord_sales_lastcalldate', value: localTime});
    },
};

function _checkAndSyncProductPricing(customerId, partnerRecord) {
    let {task} = NS_MODULES;
    let expressActive = partnerRecord.getValue({fieldId: 'custentity_zee_mp_exp_activated'});
    let standardActive = parseInt(partnerRecord.getValue({fieldId: 'custentity_zee_mp_std_activated'})) === 1;
    expressActive = !expressActive || parseInt(expressActive) === 1; // empty is also considered yes

    try {
        let scriptTask;

        if (standardActive || expressActive) {
            scriptTask = task.create({
                taskType: task.TaskType['SCHEDULED_SCRIPT'],
                scriptId: 'customscript_ss_sync_prod_pricing_mappin',
                deploymentId: 'customdeploy2',
                params: {
                    custscript_prod_pricing_cust_id: customerId
                }
            });
        }

        if (scriptTask) scriptTask.submit();
    } catch (e) { /**/ }
}

function _sendEmailsAfterSavingCommencementRegister(userId, customerId) {
    let {https, email, record, runtime} = NS_MODULES;
    let customerRecord = record.load({type: record.Type.CUSTOMER, id: customerId});
    let entityId = customerRecord.getValue({fieldId: 'entityid'});
    let companyName = customerRecord.getValue({fieldId: 'companyname'});
    let partnerId = customerRecord.getValue({fieldId: 'partner'});
    let partnerText = customerRecord.getText({fieldId: 'partner'});
    let leadSourceId = customerRecord.getValue({fieldId: 'leadsource'});
    let leadSourceText = customerRecord.getText({fieldId: 'leadsource'});
    let dayToDayEmail = customerRecord.getValue({fieldId: 'custentity_email_service'});
    let customerContacts = sharedFunctions.getCustomerContacts(customerId) // Portal User/Admin is set to Yes (1)
      .filter(item => parseInt(item.custentity_connect_user) === 1 || parseInt(item.custentity_connect_admin) === 1);

    let email_subject;
    let email_body = ' New Customer NS ID: ' + customerId +
      '</br> New Customer: ' + entityId + ' ' + companyName +
      '</br> New Customer Franchisee NS ID: ' + partnerId +
      '</br> New Customer Franchisee Name: ' + partnerText + '';
    if (parseInt(leadSourceId) === 246306) {
        email_subject = 'Shopify Customer Finalised on NetSuite';
        email_body += '</br> Email: ' + dayToDayEmail;
        email_body += '</br> Lead Source: ' + leadSourceText;
    } else {
        email_subject = 'New Customer Finalised on NetSuite';
    }

    if (customerContacts.length) { // contact with connect_user or connect_admin set to true
        let contact = customerContacts[0]; // taking only the first contact
        email_body += '</br></br> Customer Portal Access - User Details';
        email_body += '</br>First Name: ' + contact['firstname'];
        email_body += '</br>Last Name: ' + contact['lastname'];
        email_body += '</br>Email: ' + contact['email'];
        email_body += '</br>Phone: ' + contact['phone'];

        customerRecord.setValue({fieldId: 'custentity_portal_access', value: 1});
        if (!customerRecord.getValue({fieldId: 'custentity_portal_how_to_guides'}))
            customerRecord.setValue({fieldId: 'custentity_portal_how_to_guides', value: 2});
        customerRecord.save({ignoreMandatoryFields: true});

        let userJSON = '{';
        userJSON += '"customer_ns_id" : "' + customerId + '",'
        userJSON += '"first_name" : "' + contact['firstname'] + '",'
        userJSON += '"last_name" : "' + contact['lastname'] + '",'
        userJSON += '"email" : "' + contact['email'] + '",'
        userJSON += '"phone" : "' + contact['phone'] + '"'
        userJSON += '}';

        let headers = {};
        headers['Content-Type'] = 'application/json';
        headers['Accept'] = 'application/json';
        headers['x-api-key'] = 'XAZkNK8dVs463EtP7WXWhcUQ0z8Xce47XklzpcBj';

        https.post({
            url: 'https://mpns.protechly.com/new_staff',
            body: userJSON,
            headers
        });

        let taskRecord = record.create({type: 'task'});
        taskRecord.setValue({fieldId: 'title', value: 'Shipping Portal - Send Invite'});
        taskRecord.setValue({fieldId: 'assigned', value: 1706027});
        taskRecord.setValue({fieldId: 'company', value: customerId});
        taskRecord.setValue({fieldId: 'sendemail', value: true});
        taskRecord.setValue({fieldId: 'message', value: ''});
        taskRecord.setText({fieldId: 'status', text: 'Not Started'});
        taskRecord.save({ignoreMandatoryFields: true});

        // email.sendBulk({
        //     author: runtime.getCurrentUser().role === 1032 ? 112209 : userId,
        //     body: email_body,
        //     subject: 'New Customer Finalised - Portal Access Required',
        //     recipients: ['laura.busse@mailplus.com.au'],
        //     cc: ['popie.popie@mailplus.com.au',
        //         'ankith.ravindran@mailplus.com.au',
        //         'fiona.harrison@mailplus.com.au'
        //     ],
        //     relatedRecords: {
        //         'entityId': customerId
        //     },
        //     isInternalOnly: true
        // });
    }

    email.sendBulk({
        author: runtime.getCurrentUser().role === 1032 ? 112209 : userId,
        body: email_body,
        subject: email_subject,
        recipients: ['popie.popie@mailplus.com.au'],
        cc: [
            'ankith.ravindran@mailplus.com.au',
            'fiona.harrison@mailplus.com.au'
        ],
        relatedRecords: {
            'entityId': customerId
        },
        isInternalOnly: true
    });

    let customerJSON = '{';
    customerJSON += '"ns_id" : "' + customerId + '"'
    customerJSON += '}';

    let headers = {};
    headers['Content-Type'] = 'application/json';
    headers['Accept'] = 'application/json';
    headers['x-api-key'] = 'XAZkNK8dVs463EtP7WXWhcUQ0z8Xce47XklzpcBj';

    https.post({
        url: 'https://mpns.protechly.com/new_customer',
        body: customerJSON,
        headers
    });
}

function _sendEmailToFranchisee(customerId, franchiseeId, commencementDate) {
    let {record, search, email, https, format} = NS_MODULES;
    let url = 'https://1048144.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=395&deploy=1&' +
      'compid=1048144&h=6d4293eecb3cb3f4353e&rectype=customer&template=';
    let template_id = 150;
    let newLeadEmailTemplateRecord = record.load({type: 'customrecord_camp_comm_template', id: template_id});
    let templateSubject = newLeadEmailTemplateRecord.getValue({fieldId: 'custrecord_camp_comm_subject'});
    let formattedDate = format.format({value: commencementDate, type: format.Type.DATE});
    let partnerRecord = record.load({type: 'partner', id: franchiseeId});
    let salesRepId = partnerRecord.getValue({fieldId: 'custentity_sales_rep_assigned'});

    let searched_contact = search.load({type: 'contact', id: 'customsearch_salesp_contacts'});

    searched_contact.filters.push(search.createFilter({
        name: 'company',
        operator: 'is',
        values: customerId
    }));
    searched_contact.filters.push(search.createFilter({
        name: 'isinactive',
        operator: 'is',
        values: false
    }));
    searched_contact.filters.push(search.createFilter({
        name: 'email',
        operator: 'isnotempty',
        values: null
    }));

    let contactResult = searched_contact.run().getRange({start: 0, end: 1});

    let contactID = null;

    if (contactResult.length !== 0) {
        contactID = contactResult[0].getValue('internalid');

        url += template_id + '&recid=' + customerId + '&salesrep=' +
          null + '&dear=' + null + '&contactid=' + contactID + '&userid=' +
          salesRepId + '&commdate=' + formattedDate;

        let response = https.get({url});
        let emailHtml = response.body;

        email.send({
            author: salesRepId, // Associated sales rep
            subject: templateSubject,
            body: emailHtml,
            recipients: [partnerRecord.getValue({fieldId: 'email'})], // Associated franchisee
            cc: [NS_MODULES.runtime['getCurrentUser']().email], // cc current user's email
            relatedRecords: {
                'entityId': customerId
            },
            isInternalOnly: true
        });
    }
}

function _getScheduledScripParamsAndPricingNotes(customerId, commRegId) {
    let {record, format} = NS_MODULES;
    let customerRecord = record.load({type: record.Type.CUSTOMER, id: customerId, isDynamic: true});
    let pricing_notes_services = customerRecord.getValue({fieldId: 'custentity_customer_pricing_notes'});
    let initial_size_of_financial = customerRecord.getLineCount({sublistId: 'itempricing'});
    let commRegRecord = record.load({type: 'customrecord_commencement_register', id: commRegId});

    let financialTabItemArray = [];

    for (let line = 0; line < customerRecord.getLineCount({sublistId: 'itempricing'}); line++) {
        customerRecord.selectLine({sublistId: 'itempricing', line});
        financialTabItemArray[financialTabItemArray.length] = customerRecord.getCurrentSublistValue({
            sublistId: 'itempricing',
            fieldId: 'item'
        });
    }

    let serviceChangeRecords = sharedFunctions.getServiceChangeRecords(customerId, commRegId);

    let item_price_array = [];
    let financial_tab_item_array = [];
    let financial_tab_price_array = [];
    let count_array = [];

    for (let [index, serviceChangeRecord] of serviceChangeRecords.entries()) {
        let {nsItem, serviceTypeId, newServiceChangePrice, serviceDescription, serviceChangeFreqText} = serviceChangeRecord;

        let nsTypeRec = record.load({type: 'serviceitem', id: nsItem});
        let serviceText = nsTypeRec.getValue({fieldId: 'itemid'});

        if (index === 0)
            pricing_notes_services += '\n\n' + format.format({value: commRegRecord.getValue({fieldId: 'custrecord_comm_date'}), type: format.Type.DATE}) + '\n'

        pricing_notes_services += serviceText + ' - @$' + newServiceChangePrice + ' - ' +
          _formatServiceChangeFreqText(serviceChangeFreqText) + '\n';

        serviceDescription = serviceDescription ? serviceDescription.replace(/\s+/g, '-').toLowerCase() : 0;

        if (item_price_array[serviceTypeId] === undefined) {
            item_price_array[serviceTypeId] = [];
            item_price_array[serviceTypeId][0] = newServiceChangePrice + '_' + serviceDescription;
        } else {
            let size = item_price_array[serviceTypeId].length;
            item_price_array[serviceTypeId][size] = newServiceChangePrice + '_' + serviceDescription;
        }
    }

    for (let serviceChangeRecord of serviceChangeRecords) {
        let {nsItem, serviceTypeId, newServiceChangePrice} = serviceChangeRecord;

        let serviceTypeRec = record.load({type: 'customrecord_service_type', id: serviceTypeId});

        if (count_array[serviceTypeId] === undefined) {
            count_array[serviceTypeId] = -1;
        }

        let size = item_price_array[serviceTypeId].length;

        //if the size is 1, directly create in the financial tab
        if (size === 1) {
            initial_size_of_financial++;
            financial_tab_item_array[initial_size_of_financial] = nsItem;
            financial_tab_price_array[initial_size_of_financial] = newServiceChangePrice;
        } else {
            //if the size is more than 1, go through the NS array in the service type record and create the ns iitems in the financial tab respectively
            let ns_array_items = serviceTypeRec.getValue({fieldId: 'custrecord_service_type_ns_item_array'});
            if (ns_array_items) {

                let ns_items = ns_array_items.split(",")

                if (count_array[serviceTypeId] < ns_items.length) {
                    initial_size_of_financial++;
                    if (count_array[serviceTypeId] === -1) {
                        financial_tab_item_array[initial_size_of_financial] = serviceTypeRec.getValue({fieldId: 'custrecord_service_type_ns_item'});
                        financial_tab_price_array[initial_size_of_financial] = newServiceChangePrice;

                        count_array[serviceTypeId] = count_array[serviceTypeId] + 1;

                    } else {

                        financial_tab_item_array[initial_size_of_financial] = ns_items[count_array[serviceTypeId]];
                        financial_tab_price_array[initial_size_of_financial] = newServiceChangePrice;

                        count_array[serviceTypeId] = count_array[serviceTypeId] + 1;
                    }
                }
            } else if (count_array[serviceTypeId] === -1) {

                initial_size_of_financial++;
                financial_tab_item_array[initial_size_of_financial] = serviceTypeRec.getValue({fieldId: 'custrecord_service_type_ns_item'});
                financial_tab_price_array[initial_size_of_financial] = newServiceChangePrice;
                count_array[serviceTypeId] = count_array[serviceTypeId] + 1;
            }
        }
    }

    let params = {
        custscriptcustomer_id: parseInt(customerId),
        custscriptids: financialTabItemArray.toString(),
        custscriptlinked_service_ids: null,
        custscriptfinancial_tab_array: financial_tab_item_array.toString(),
        custscriptfinancial_tab_price_array: financial_tab_price_array.toString()
    };

    return {params, pricing_notes_services};
}

function _formatServiceChangeFreqText(text) {
    let arr = text.split(',');
    let orderArray = ['Adhoc', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    arr.sort((a, b) => (orderArray.indexOf(a) - orderArray.indexOf(b)));
    let freqText = arr.join(',');

    return freqText === ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].join(',') ? 'Daily' : freqText;
}

function _changeCustomerStatusIfNotSigned(customerRecord, newStatus) {
    if (parseInt(customerRecord.getValue({fieldId: 'entitystatus'})) !== 13)
        customerRecord.setValue({fieldId: 'entitystatus', value: newStatus});
}

function _changeStatusIfNotCustomer(customerRecord, newStatus) {
    if ([13, 32, 71].includes(parseInt(customerRecord.getValue({fieldId: 'entitystatus'})))) return;

    customerRecord.setValue({fieldId: 'entitystatus', value: newStatus});
}

function _getLocalTimeFromOffset(localUTCOffset) {
    let today = new Date();
    let serverUTCOffset = today.getTimezoneOffset();

    let localTime = new Date();
    localTime.setTime(today.getTime() + (serverUTCOffset - parseInt(localUTCOffset)) * 60 * 1000);

    return localTime;
}

function _getTodayDateObjectForDateField() {
    let clientOffset = -660; // typical AEST offset
    let serverOffset = new Date().getTimezoneOffset();
    let hoursToOffset = (clientOffset - serverOffset) / -60;
    let date = new Date();
    return new Date(date.setTime(date.getTime() + (hoursToOffset*60*60*1000)));
}

function _informFranchiseeOfLostLeadThatTheyEntered(customerRecord, lostReason, lostNote) {
    let customerId = customerRecord.getValue({fieldId: 'id'});
    let customerName = customerRecord.getValue({fieldId: 'entityid'}) + ' ' + customerRecord.getValue({fieldId: 'companyname'});
    let customerStatus = parseInt(customerRecord.getValue({fieldId: 'entitystatus'}));
    let partnerRecord = NS_MODULES.record.load({type: 'partner', id: customerRecord.getValue({fieldId: 'partner'})});
    let customerLink = 'https://1048144.app.netsuite.com/app/common/entity/custjob.nl?id=' + customerId;
    let salesRepId = NS_MODULES.search['lookupFields']({
        type: 'customer',
        id: customerId,
        columns: ['partner.custentity_sales_rep_assigned']
    })['partner.custentity_sales_rep_assigned'][0].value;
    let emailBody = '';

    emailBody += 'A lead that you entered has been marked as Lost. ' + '<br><br>';
    emailBody += 'Customer Name: ' + '<a href="' + customerLink + '" target="_blank">' + customerName + '</a>' + '<br>';
    emailBody += 'Lost Reason: ' + lostReason + '<br>'
    emailBody += 'Note from Sales Rep: ' + lostNote +'<br>';

    NS_MODULES.email.send({
        author: customerStatus === 13 ? salesRepId : NS_MODULES.runtime['getCurrentUser']().id, // Associated sales rep
        subject: 'Lost Lead',
        body: emailBody,
        recipients: [partnerRecord.getValue({fieldId: 'email'})], // Associated franchisee
        relatedRecords: {
            'entityId': customerId
        },
        isInternalOnly: true
    });
}

function _createUserNote(customerId, title, note, authorId = null) {
    let {record, runtime} = NS_MODULES;
    let noteData = {
        // the 3 following fields will be autofilled
        entity: customerId, // Customer ID that this belongs to
        notedate: new Date(), // Date Create
        author: authorId || runtime['getCurrentUser']().id, // Author of this note

        direction: 1, // Incoming (1)
        notetype: 7, // Note (7)
        note: note || 'None (no note was provided)',
        title
    }

    let userNoteRecord = record.create({
        type: record.Type['NOTE'],
    });

    for (let fieldId in noteData)
        userNoteRecord.setValue({fieldId, value: noteData[fieldId]});

    return userNoteRecord.save({ignoreMandatoryFields: true});
}

function _createProductPricing(customerId, city, postcode) {
    if (!customerId || !city || !postcode)
        return NS_MODULES.log.debug({title: '_createProductPricing',
            details: `Null values. customerId: ${customerId}, city: ${city}, postcode: ${postcode}`});

    let {record} = NS_MODULES;
    let customerRecord = record.load({type: record.Type.CUSTOMER, id: customerId});
    let partnerId = customerRecord.getValue({fieldId: 'partner'});
    let partnerRecord = record.load({type: 'partner', id: partnerId});

    let standardActive = parseInt(partnerRecord.getValue({fieldId: 'custentity_zee_mp_std_activated'})) === 1;
    let expressActive = parseInt(partnerRecord.getValue({fieldId: 'custentity_zee_mp_exp_activated'})) === 1;

    let PRODUCTS = {
        W_5KG: 1,
        W_3KG: 2,
        W_1KG: 3,
        W_500G: 4,
        B4: 5,
        W_10KG: 8,
        W_25KG: 9,
        W_250G: 10,
        W_20KG: 11,
    }
    let nsZoneID = _getNSZoneId(city, postcode);

    if (standardActive) {
        let itemInternalstd250gID = _getProductId(5, PRODUCTS.W_250G, nsZoneID, 1, 13);
        let itemInternalstd500gID = _getProductId(5, PRODUCTS.W_500G, nsZoneID, 1, 13);
        let itemInternalstd1kgID = _getProductId(5, PRODUCTS.W_1KG, nsZoneID, 1, 13);
        let itemInternalstd3kgID = _getProductId(5, PRODUCTS.W_3KG, nsZoneID, 1, 13);
        let itemInternalstd5kgID = _getProductId(5, PRODUCTS.W_5KG, nsZoneID, 1, 13);
        let itemInternalstd10kgID = _getProductId(5, PRODUCTS.W_10KG, nsZoneID, 1, 13);
        let itemInternalstd20kgID = _getProductId(5, PRODUCTS.W_20KG, nsZoneID, 1, 13);
        let itemInternalstd25kgID = _getProductId(5, PRODUCTS.W_25KG, nsZoneID, 1, 13);

        let standardProductPricingRecord = record.create({type: 'customrecord_product_pricing'});
        standardProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_last_update', value: new Date()});
        standardProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_customer', value: customerId});
        standardProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_delivery_speeds', value: 1});
        standardProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_20kg', value: itemInternalstd20kgID});
        standardProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_250g', value: itemInternalstd250gID});
        standardProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_10kg', value: itemInternalstd10kgID});
        standardProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_25kg', value: itemInternalstd25kgID});
        standardProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_500g', value: itemInternalstd500gID});
        standardProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_1kg', value: itemInternalstd1kgID});
        standardProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_3kg', value: itemInternalstd3kgID});
        standardProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_5kg', value: itemInternalstd5kgID});
        standardProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_status', value: 2});
        standardProductPricingRecord.setValue({fieldId: 'custrecord_sycn_complete', value: 2});
        standardProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_pricing_plan', value: 13});
        standardProductPricingRecord.save({ignoreMandatoryFields: true});
    }

    if (expressActive) {
        let itemInternalexpB4ID = _getProductId(2, PRODUCTS.B4, null, null, 15);
        let itemInternalexp500gID = _getProductId(2, PRODUCTS.W_500G, null, null, 15);
        let itemInternalexp1kgID = _getProductId(2, PRODUCTS.W_1KG, null, null, 15);
        let itemInternalexp3kgID = _getProductId(2, PRODUCTS.W_3KG, null, null, 15);
        let itemInternalexp5kgID = _getProductId(2, PRODUCTS.W_5KG, null, null, 15);

        let expressProductPricingRecord = record.create({type: 'customrecord_product_pricing'});
        expressProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_last_update', value: new Date()});
        expressProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_customer', value: customerId});
        expressProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_delivery_speeds', value: 2});
        expressProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_b4', value: itemInternalexpB4ID});
        expressProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_500g', value: itemInternalexp500gID});
        expressProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_1kg', value: itemInternalexp1kgID});
        expressProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_3kg', value: itemInternalexp3kgID});
        expressProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_5kg', value: itemInternalexp5kgID});
        expressProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_status', value: 2});
        expressProductPricingRecord.setValue({fieldId: 'custrecord_sycn_complete', value: 2});
        expressProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_pricing_plan', value: 15});
        expressProductPricingRecord.save({ignoreMandatoryFields: true});
    }

    try {
        // Create Premium Product Pricing
        let itemInternalPremium10kg = _getProductId(9, PRODUCTS.W_10KG, null, null, 17);
        let itemInternalPremium20kg = _getProductId(9, PRODUCTS.W_20KG, null, null, 17);
        let itemInternalPremium1kg = _getProductId(9, PRODUCTS.W_1KG, null, null, 17);
        let itemInternalPremium3kg = _getProductId(9, PRODUCTS.W_3KG, null, null, 17);
        let itemInternalPremium5kg = _getProductId(9, PRODUCTS.W_5KG, null, null, 17);

        let premiumProductPricingRecord = record.create({type: 'customrecord_product_pricing'});
        premiumProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_last_update', value: new Date()});
        premiumProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_customer', value: customerId});
        premiumProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_delivery_speeds', value: 4});
        premiumProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_10kg', value: itemInternalPremium10kg});
        premiumProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_20kg', value: itemInternalPremium20kg});
        premiumProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_1kg', value: itemInternalPremium1kg});
        premiumProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_3kg', value: itemInternalPremium3kg});
        premiumProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_5kg', value: itemInternalPremium5kg});
        premiumProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_status', value: 2});
        premiumProductPricingRecord.setValue({fieldId: 'custrecord_sycn_complete', value: 2});
        premiumProductPricingRecord.setValue({fieldId: 'custrecord_prod_pricing_pricing_plan', value: 17});
        premiumProductPricingRecord.save({ignoreMandatoryFields: true});
    } catch (e) { NS_MODULES.log.error('_createProductPricing: Premium Product Pricing', e); }
}

function _getNSZoneId(city, postcode) {
    let {search} = NS_MODULES;
    let nsZoneID = 4;
    let serviceSearch = search.load({id: 'customsearch_sendle_dom_zones', type: 'customrecord_dom_zones'});

    serviceSearch.filters = [
        search.createFilter({name: 'custrecord_dom_zones_postcode', operator: 'is', values: postcode}),
        search.createFilter({name: 'custrecord_dom_zones_suburb_name', operator: 'is', values: city}),
    ];

    serviceSearch.run().each(function (item) {
        nsZoneID = parseInt(item.getValue('custrecord_dom_zones_ns_zones'));

        return true;
    });

    return nsZoneID;
}

function _getProductId(carrierId, productWeightId, nsZoneId, receiverZoneId, pricingPlanId) {
    let {search} = NS_MODULES;
    let productId = null;

    let serviceSearch = search.load({id: 'customsearch3745', type: 'noninventoryitem'});

    serviceSearch.filters = [
        search.createFilter({name: 'custitem_carrier', operator: 'anyof', values: carrierId}),
        search.createFilter({name: 'custitem_product_weight', operator: 'anyof', values: productWeightId}),
        search.createFilter({name: 'custitem_price_plans', operator: 'anyof', values: pricingPlanId}),
    ]

    if (nsZoneId)
        serviceSearch.filters
            .push(search.createFilter({name: 'custitem_item_zones', operator: 'anyof', values: nsZoneId}));

    if (receiverZoneId)
        serviceSearch.filters
            .push(search.createFilter({name: 'custitem_item_receiver_zones', operator: 'anyof', values: receiverZoneId}));

    serviceSearch.run().each(function (item) {
        productId = item.getValue('internalid');

        return true;
    });

    return productId;
}

const _utils = {
    processSavedSearchResults(data, result) {
        let tmp = {};
        for (let column of result['columns']) {
            tmp[column.name] = result['getValue'](column);
            tmp[column.name + '_text'] = result['getText'](column);
        }
        data.push(tmp);

        return true;
    },
    findLocationByFilters(filters) {
        let {search} = NS_MODULES;
        let data = [];
        let ncLocationFieldIds = Object.keys(ncLocation);

        let locationResults = search.create({
            type: 'customrecord_ap_lodgment_location',
            filters,
            columns: [...ncLocationFieldIds],
        }).run();

        let cycle = 0;
        while (cycle >= 0) { // basically while(true)
            let subset = locationResults['getRange']({start: cycle * 1000, end: cycle * 1000 + 1000});
            for (let location of subset) { // we can also use getAllValues() on one of these to see all available fields
                let entry = {};
                for (let fieldId of ncLocationFieldIds) {
                    if (['custrecord_noncust_location_type', 'custrecord_ap_lodgement_site_state'].includes(fieldId)) {
                        entry[fieldId] = location.getText({name: fieldId});
                    } else entry[fieldId] = location.getValue({name: fieldId});
                }
                data.push(entry);
            }
            if (subset.length < 1000) break;
            cycle++;
        }

        return data;
    },

    shortenUrl(longUrl, title) {
        let {code, body} = NS_MODULES.https.post({
            url: defaultValues.shortIoEndpoint,
            headers: {
                "authorization": defaultValues.shortIoKey,
                "content-type": "application/json"
            },
            body: JSON.stringify({
                "originalURL" : longUrl,
                "domain" : "mpau.link",
                title
            }),
        });

        if (parseInt(code) !== 200) throw 'Error when trying to shorten link: ' + JSON.stringify(body);

        return JSON.parse(body)['secureShortURL'];
    },
    sendSMS(phoneNumber, message) {
        let {code, body} = NS_MODULES.https.post({
            url: defaultValues.twilioEndpoint,
            body: {
                "Body": message,
                "To": phoneNumber,
                "From": defaultValues.smsSenderNumber
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${defaultValues.twilioSecret}`
            }
        });

        if (parseInt(code) < 200 || parseInt(code) >= 300) throw `Error (${code}) when trying to send SMS`;

        return body;
    }
}