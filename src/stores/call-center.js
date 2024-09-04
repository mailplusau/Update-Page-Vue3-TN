import { defineStore } from 'pinia';
import http from '@/utils/http.mjs';
import {useCustomerStore} from '@/stores/customer';
import {useSalesRecordStore} from '@/stores/sales-record';
import {useGlobalDialog} from '@/stores/global-dialog';
import {useUserStore} from '@/stores/user';
import {useAddressesStore} from '@/stores/addresses';
import {useContactStore} from '@/stores/contacts';
import {useMainStore} from '@/stores/main';
import {offsetDateObjectForNSDateField} from '@/utils/utils.mjs';
import {addDays} from 'date-fns';
import {useFranchiseeStore} from '@/stores/franchisee';
import {commReg as commRegFields, serviceChange as serviceChangeFields} from '@/utils/defaults.mjs';

const baseUrl = 'https://' + import.meta.env.VITE_NS_REALM + '.app.netsuite.com';

const state = {
    salesNoteDialog: {
        open: false,
        title: '',
        subtitle: '',
        note: '',
        pendingAction: null,

        needParkingLotReason: false,
        reasonId: null,
    }
};

const getters = {

};

const actions = {
    async ccHandleChangeOfService(promptedForNote = false) {
        if (!_.checkGeocodedAddresses() || !_.checkEmailsNotEmptyOrDefaulted() || !_.checkABNNotEmpty()) return;

        if (!promptedForNote) return openSalesNoteDialog(this, 'Change of Service',
            'Make changes to the services of this customer.', () => this.ccHandleChangeOfService(true));

        useGlobalDialog().displayBusy('', 'Redirecting to Send Email module. Please Wait...');

        await _.createSalesNote(this);

        _.goToSendEmailModule(this, {changeOfService: 'T'});
    },

    async ccSendNormalEmail(promptedForNote = false) {
        if (!promptedForNote) return openSalesNoteDialog(this,
            'Send Email', 'You will be redirected to Send Email module', () => this.ccSendNormalEmail(true));

        useGlobalDialog().displayBusy('', 'Redirecting to Send Email module. Please Wait...');

        await _.createSalesNote(this);

        _.goToSendEmailModule(this, {sendEmail: 'T'})
    },
    async ccSetAppointment(promptedForNote = false) {
        if (!promptedForNote) return openSalesNoteDialog(this,
            'Set Appointment', 'You will be redirected to Send Email module', () => this.ccSetAppointment(true));

        useGlobalDialog().displayBusy('', 'Redirecting to Send Email module. Please Wait...');

        await _.createSalesNote(this);

        _.goToSendEmailModule(this, {callback: 'T'})
    },
    async ccGiftBoxRequired(promptedForNote = false) {
        if (!promptedForNote) return openSalesNoteDialog(this,
            'Requiring Gift Box', '', () => this.ccGiftBoxRequired(true));

        useGlobalDialog().displayProgress('', 'Sending request for gift box. Please Wait...');

        await _.createSalesNote(this);

        let res = await http.post('sendGiftBoxRequest', {customerId: useCustomerStore().id});

        await useGlobalDialog().close(1500, res);
    },
    async ccReassignToRep(promptedForNote = false) {
        if (!promptedForNote) return openSalesNoteDialog(this,
            'Reassign to rep', '', () => this.ccReassignToRep(true));

        useGlobalDialog().displayProgress('', 'Checking for status. Please wait...');

        await _.createSalesNote(this);

        await useGlobalDialog().close(2000, 'Complete! You will be re-directed.')

        let url = baseUrl + top['nlapiResolveURL']('suitelet', 'customscript_sl_sales_campaign_popup', 'customdeploy_sl_sales_campaign_popup') + '&sales_record_id=' +
            parseInt(useSalesRecordStore().id) + '&recid=' + parseInt(useCustomerStore().id);

        top.open(url, "_self", "height=300,width=300,modal=yes,alwaysRaised=yes,location=0,toolbar=0");
    },

    async ccHandleContactMade(promptedForNote = false) {
        if (!promptedForNote) return openSalesNoteDialog(this,
            'Made Contact', 'Status will be changed to SUSPECT-In Contact (69)', () => this.ccHandleContactMade(true));

        useGlobalDialog().displayProgress('', 'Changing status to SUSPECT-In Contact (69). Please wait...');

        await Promise.allSettled([
            _.createSalesNote(this),
            (async () => {
                if ([13, 32, 72].includes(parseInt(useCustomerStore().details.entitystatus))) return;

                useCustomerStore().form.data.entitystatus = 69; // SUSPECT-In Contact (69)
                await useCustomerStore().saveCustomer(['entitystatus'], false);
            })()
        ])

        const completeMsg = `Complete! Status has been changed to ${useCustomerStore().texts['entitystatus']}.`

        await useGlobalDialog().close(2000, completeMsg);

        useCustomerStore().goToRecordPage();
    },
    async ccHandleNoAnswerOnPhone(promptedForNote = false) {
        if (!promptedForNote) return openSalesNoteDialog(this,
            'No Answer - Phone Call', 'Status will be changed to Suspect - No Answer (20)', () => this.ccHandleNoAnswerOnPhone(true));

        useGlobalDialog().displayProgress('', 'Changing status to Suspect - No Answer (20). Please wait...');

        await Promise.allSettled([
            _.createSalesNote(this),
            _.sendCallCenterOutcome(this, 'NO_ANSWER_PHONE')
        ]);

        await useGlobalDialog().close(2000, `Complete! You will be redirected to Record page.`);

        useCustomerStore().goToRecordPage();
    },
    async ccNoResponseEmail(promptedForNote = false) {
        if (!promptedForNote) return openSalesNoteDialog(this, 'No Response - Email',
            'Status will be changed to Suspect - No Answer (20)', () => this.ccNoResponseEmail(true));

        useGlobalDialog().displayProgress('', 'Changing status to Suspect - No Answer (20). Please wait...');

        await Promise.allSettled([
            _.createSalesNote(this),
            _.sendCallCenterOutcome(this, 'NO_RESPONSE_EMAIL')
        ]);

        await useGlobalDialog().close(2000, `Complete! You will be redirected to Record page.`);

        useCustomerStore().goToRecordPage();
    },
    async ccHandleOffPeak(promptedForNote = false) {
        if (!promptedForNote) return openSalesNoteDialog(this, 'Parking Lot',
            'Status will be changed to Suspect - Parking Lot (62)', () => this.ccHandleOffPeak(true), true);

        useGlobalDialog().displayProgress('', 'Changing status of lead. Please wait...');

        useCustomerStore().form.data.custentity_lead_parking_lot_reasons = this.salesNoteDialog.reasonId;
        useCustomerStore().form.data.entitystatus = [13, 32, 72].includes(parseInt(useCustomerStore().details.entitystatus))
            ? useCustomerStore().form.data.entitystatus : 62; // SUSPECT-Parking Lot (62)

        await Promise.allSettled([
            _.createSalesNote(this),
            useCustomerStore().saveCustomer(['entitystatus', 'custentity_lead_parking_lot_reasons'], false)
        ]);

        await useGlobalDialog().close(2000, `Complete! You will be redirected to Record page.`);

        useCustomerStore().goToRecordPage();
    },

    async ccStartFreeTrial(promptedForNote = false) {
        if (!_.checkGeocodedAddresses() || !_.checkEmailsNotEmptyOrDefaulted() || !_.checkABNNotEmpty()) return;

        if (!promptedForNote) return openSalesNoteDialog(this, 'Start Free Trial',
            'Status will be changed to Customer - Free Trial (32)', () => this.ccStartFreeTrial(true));

        useGlobalDialog().displayProgress('', 'Starting Free Trial for the customer. Please wait...');

        useCustomerStore().form.data.entitystatus = 32; // CUSTOMER-Free Trial (32)

        await Promise.allSettled([
            _.createSalesNote(this),
            useCustomerStore().saveCustomer(['entitystatus'], false)
        ]);

        await useGlobalDialog().close(2000, `Complete! You will be redirected to Record page.`);

        useCustomerStore().goToRecordPage();
    },
    async ccPrepareFreeTrial(promptedForNote = false) {
        if (!_.checkGeocodedAddresses() || !_.checkEmailsNotEmptyOrDefaulted() || !_.checkABNNotEmpty()) return;

        if (!promptedForNote) return openSalesNoteDialog(this, 'Prepare for Free Trial',
            'You will go through Free Trial workflow.', () => this.ccPrepareFreeTrial(true));

        if (!useCustomerStore().hasPortalAccess) await promptForPortalAccess();

        useGlobalDialog().displayBusy('', 'Redirecting to Send Email module. Please Wait...');

        await _.createSalesNote(this);

        _.goToSendEmailModule(this, {freetrial: 'T', savecustomer: 'F'})
    },
    async ccSignCustomer(promptedForNote = false) {
        if (!_.checkGeocodedAddresses() || !_.checkEmailsNotEmptyOrDefaulted() || !_.checkABNNotEmpty()) return;

        if (!promptedForNote) return openSalesNoteDialog(this, 'Signing New Customer',
            '', () => this.ccSignCustomer(true));

        if (!useCustomerStore().hasPortalAccess) await promptForPortalAccess();

        useGlobalDialog().displayBusy('', 'Redirecting to Send Email module. Please Wait...');

        await _.createSalesNote(this);

        _.goToSendEmailModule(this, {closedwon: 'T', savecustomer: 'F'})
    },
    async ccQuoteProspect(promptedForNote = false) {
        if (!_.checkGeocodedAddresses() || !_.checkEmailsNotEmptyOrDefaulted() || !_.checkABNNotEmpty()) return;

        if (!promptedForNote) return openSalesNoteDialog(this, 'Quoting Prospect',
            '', () => this.ccQuoteProspect(true));

        if (!useCustomerStore().hasPortalAccess) await promptForPortalAccess();

        useGlobalDialog().displayBusy('', 'Redirecting to Send Email module. Please Wait...');

        await _.createSalesNote(this);

        _.goToSendEmailModule(this, {oppwithvalue: 'T', savecustomer: 'F'})
    },
    async ccBoxSent(promptedForNote = false) {
        if (!_.checkGeocodedAddresses() || !_.checkEmailsNotEmptyOrDefaulted() || !_.checkABNNotEmpty()) return;

        if (!promptedForNote) return openSalesNoteDialog(this, 'Box Sent',
            'Status will be changed to Prospect - Box Sent (72)', () => this.ccBoxSent(true));

        useGlobalDialog().displayProgress('', 'Changing status to Prospect - Box Sent (72). Please wait...');

        useCustomerStore().form.data.entitystatus = 72; // PROSPECT-Box Sent (72)

        await Promise.allSettled([
            _.createSalesNote(this),
            useCustomerStore().saveCustomer(['entitystatus'], false)
        ]);

        useGlobalDialog().displayProgress('', 'Creating Commencement Register...');

        const commRegData = {
            ...commRegFields,
            custrecord_date_entry: offsetDateObjectForNSDateField(new Date),
            custrecord_comm_date: offsetDateObjectForNSDateField(addDays(new Date(), 1)),
            custrecord_comm_date_signup: offsetDateObjectForNSDateField(new Date),
            custrecord_sale_type: '1', // New Customer
            custrecord_in_out: '2',
            custrecord_customer: useCustomerStore().id,
            custrecord_salesrep: useSalesRecordStore().details.custrecord_sales_assigned,
            custrecord_franchisee: useFranchiseeStore().id,
            custrecord_trial_status: '10', // Quote (10)
            custrecord_commreg_sales_record: useSalesRecordStore().id,
            custrecord_wkly_svcs: '5',
            custrecord_state: useFranchiseeStore().details.location,
        };

        const {commRegId} = await http.post('saveOrCreateCommencementRegister', {
            commRegData,
        });

        useGlobalDialog().displayProgress('', 'Generating Service Commencement Form...');

        let params = {
            script: 746,
            deploy: 1,
            stage: 0,
            custid: useCustomerStore().id,
            scfid: 159,
            start: 'null',
            end: 'null',
            commreg: commRegId,
            salesrecordid: useSalesRecordStore().id,
        }

        const fileContent = await http.getBase64PDF(baseUrl + '/app/site/hosting/scriptlet.nl', params);
        const dateStr = (new Date()).toISOString().split('T')[0];
        const entityId = useCustomerStore().details.entityid;

        await http.post('saveOrCreateCommencementRegister', {
            commRegId, commRegData, fileContent, fileName: `${dateStr}_${entityId}.pdf`
        });

        useGlobalDialog().displayProgress('', 'Creating Services...');

        let serviceChangeData = {
            ...serviceChangeFields,
            custrecord_servicechg_status: '1', // Scheduled (1)
            custrecord_servicechg_comm_reg: commRegId,
            custrecord_servicechg_type: 'New Customer', // Service Change Type
            custrecord_default_servicechg_record: '1', // Default Service Change Record: Yes (1), No (2), Sometimes (3), Undecided (4)
            custrecord_servicechg_created: useUserStore().id, // Created By...
            custrecord_servicechg_date_effective: commRegData.custrecord_comm_date, // Date - Effective
            custrecord_servicechg_new_price: 0, // New Price
            custrecord_servicechg_new_freq: '6', // New Frequency
        }
        let serviceData = {
            isinactive: true,
            custrecord_service: 24, // MP Parcel Pickup
            name: 'MP Parcel Pickup',
            custrecord_service_customer: useCustomerStore().id,
            custrecord_service_comm_reg: commRegId,
            custrecord_service_price: 0,
            custrecord_service_description: '',
            custrecord_service_day_adhoc: true,
        };

        serviceChangeData['custrecord_servicechg_service'] = await http.post('saveOrCreateService', {serviceData});
        await http.post('saveOrCreateServiceChange', {serviceChangeData});

        await useGlobalDialog().close(2000, `Complete! You will be redirected to Record page.`);

        useCustomerStore().goToRecordPage();
    },
    async ccHandleQualifiedProspect(promptedForNote = false) {
        if (!promptedForNote) return openSalesNoteDialog(this, 'Qualified - In Discussion',
            'Status will be changed to Prospect - Opportunity (58)', () => this.ccHandleQualifiedProspect(true));

        useGlobalDialog().displayProgress('', 'Changing status to Prospect - Opportunity (58). Please wait...');

        useCustomerStore().form.data.entitystatus = 58; // PROSPECT-Opportunity (58)

        await Promise.allSettled([
            _.createSalesNote(this),
            useCustomerStore().saveCustomer(['entitystatus'], false)
        ]);

        await useGlobalDialog().close(2000, `Complete! You will be redirected to Record page.`);

        useCustomerStore().goToRecordPage();
    },

    async ccNotifyITTeam() {
        if (!_.checkGeocodedAddresses() || !_.checkEmailsNotEmptyOrDefaulted() || !_.checkABNNotEmpty()) return;

        useGlobalDialog().displayProgress('', 'Changing status to Suspect - No Answer (20). Please wait...');

        await http.post('notifyITTeam', {
            customerId: useCustomerStore().id,
            salesRecordId: useSalesRecordStore().id,
        });

        await useGlobalDialog().close(2000, `Complete! You will be redirected to Send Email module.`);

        _.goToSendEmailModule(this, {closedwon: 'T', savecustomer: 'T'})
    },
    async ccQuoteWinBack(promptedForNote = false) {
        if (!_.checkGeocodedAddresses() || !_.checkEmailsNotEmptyOrDefaulted() || !_.checkABNNotEmpty()) return;

        if (!promptedForNote) return openSalesNoteDialog(this, 'Quoting Prospect',
            '', () => this.ccQuoteWinBack(true));

        useGlobalDialog().displayBusy('', 'Redirecting to Send Email module. Please Wait...');

        await _.createSalesNote(this);

        _.goToSendEmailModule(this, {closedwon: 'T', savecustomer: 'T'})
    },
    async ccHandleNoSale(promptedForNote = false) {
        if (!promptedForNote) return openSalesNoteDialog(this, 'No sales / No contact',
            'You will go through Lead Lost workflow.', () => this.ccHandleNoSale(true));

        useGlobalDialog().displayBusy('', 'Redirecting to Send Email module. Please Wait...');

        await _.createSalesNote(this);

        _.goToSendEmailModule(this, {nosale: 'T'})
    },
    async ccFollowUp(promptedForNote = false) {
        if (!promptedForNote) return openSalesNoteDialog(this, 'Follow-up',
            'Lead will be marked as Follow-up', () => this.ccFollowUp(true));

        useGlobalDialog().displayProgress('', 'Marking lead as Follow-up. Please wait...');

        await Promise.allSettled([
            _.createSalesNote(this),
            _.sendCallCenterOutcome(this, 'FOLLOW_UP')
        ]);

        await useGlobalDialog().close(2000, `Complete! You will be redirected to Record page.`);

        useCustomerStore().goToRecordPage();
    },

    async ccHandleNoAnswerEmail(promptedForNote = false) {
        if (!promptedForNote) return openSalesNoteDialog(this, 'Lost - No Response',
            'Lead will be marked as No Response', () => this.ccHandleNoAnswerEmail(true));

        useGlobalDialog().displayProgress('', 'Marking lead as No Response. Please wait...');

        await Promise.allSettled([
            _.createSalesNote(this),
            _.sendCallCenterOutcome(this, 'NO_ANSWER_EMAIL')
        ]);

        await useGlobalDialog().close(2000, `Complete! You will be redirected to Record page.`);

        useCustomerStore().goToRecordPage();
    },
    async ccHandleNotEstablished(promptedForNote = false) {
        if (!promptedForNote) return openSalesNoteDialog(this, 'Lost - Not Established',
            'Lead will be marked as Not Established', () => this.ccHandleNotEstablished(true));

        useGlobalDialog().displayProgress('', 'Marking lead as Not Established. Please wait...');

        await Promise.allSettled([
            _.createSalesNote(this),
            _.sendCallCenterOutcome(this, 'NOT_ESTABLISHED')
        ]);

        await useGlobalDialog().close(2000, `Complete! You will be redirected to Record page.`);

        useCustomerStore().goToRecordPage();
    },

    async ccApproveLpoLead(promptedForNote = false) {
        if (!promptedForNote) return openSalesNoteDialog(this, 'LPO Approve',
            'Status will be changed to Suspect - Qualified (42)', () => this.ccApproveLpoLead(true));

        useGlobalDialog().displayProgress('', 'Changing status to Suspect - Qualified (42). Please wait...');

        useCustomerStore().form.data.entitystatus = 42; // SUSPECT-Qualified (42)

        await Promise.allSettled([
            _.createSalesNote(this),
            useCustomerStore().saveCustomer(['entitystatus'], false)
        ]);

        await useGlobalDialog().close(2000, `Complete! You will be redirected to Record page.`);

        useCustomerStore().goToRecordPage();
    },
    async ccChangeLpoCampaign() {
        if (![69, 76].includes(useSalesRecordStore().campaignId)) return;

        useGlobalDialog().displayProgress('',
            `Changing campaign from ${useSalesRecordStore().campaignId === 69 ? 'LPO to LPO - BAU' : 'LPO - BAU to LPO'}. Please wait...`);

        await Promise.allSettled([
            _.createSalesNote(this),
            http.post('changeSalesRecordCampaign', {
                salesRecordId: useSalesRecordStore().id, campaignId: (69 + 76) - useSalesRecordStore().campaignId
            })
        ]);

        await useSalesRecordStore().init();

        await useGlobalDialog().close(2000, `Complete! Sales campaign is now ${useSalesRecordStore().texts['custrecord_sales_campaign']}.`);
    }
};

const _ = {
    async createSalesNote(ctx) {
        if (!ctx.salesNoteDialog.note) return;

        try {
            await http.post('createSalesNote', {
                salesNote: ctx.salesNoteDialog.note,
                customerId: useCustomerStore().id,
                salesRecordId: useSalesRecordStore().id,
            });

            ctx.salesNoteDialog.note = '';
        } catch (e) { console.error(e); }
    },
    async sendCallCenterOutcome(ctx, outcome) {
        try {
            await http.post('handleCallCenterOutcomes', {
                salesNote: ctx.salesNoteDialog.note,
                customerId: useCustomerStore().id,
                salesRecordId: useSalesRecordStore().id,
                userId: useUserStore().id,
                localUTCOffset: new Date().getTimezoneOffset(),
                outcome
            });

            ctx.salesNoteDialog.note = '';
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    },
    goToSendEmailModule(ctx, extraParams) {
        let params = {
            custid: useCustomerStore().id,
            sales_record_id: parseInt(useSalesRecordStore().id),
            id: 'customscript_sl_finalise_page_tn_v2_vue',
            deploy: 'customdeploy_sl_finalise_page_tn_v2_vue',

            ...extraParams,
        };

        params = JSON.stringify(params);
        let upload_url = baseUrl + top['nlapiResolveURL']('suitelet',
            'customscript_sl_email_sender_tn_v2_vue', 'customdeploy_sl_email_sender_tn_v2_vue') + '&params=' + params;

        top.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
    },

    checkGeocodedAddresses() {
        if (!useAddressesStore().data.length) {
            useGlobalDialog().displayError('No Address Found', 'Customer has no address. Please add at least 1 address for this customer.');
            return false;
        }
        let index = useAddressesStore().data.findIndex(item => (!item.custrecord_address_lat || !item.custrecord_address_lon));

        if (index >= 0)
            useGlobalDialog().displayError('Address Not Geocoded', 'One of the addresses is not geocoded. Please geocode the address using the autofill first then try again.');

        return index < 0;
    },
    checkEmailsNotEmptyOrDefaulted() {
        let valuesToCheck = [null, '', 'abc@abc.com'];

        if (valuesToCheck.includes(useCustomerStore().details.custentity_email_service)) {
            useGlobalDialog().displayError('Invalid email addresses', 'Customer Record has invalid email addresses. Please check day-to-day email of the customer. Make sure they are valid.');
            return false;
        }

        let index = useContactStore().data.findIndex(item => valuesToCheck.indexOf(item.email) >= 0);

        if (index >= 0) {
            useGlobalDialog().displayError('Invalid email addresses', 'Contact has invalid email addresses. Please check the contact\'s email address. Make sure they are valid.');
            return false;
        }

        return true;
    },
    checkABNNotEmpty() {
        if (!useCustomerStore().details.vatregnumber) {
            useGlobalDialog().displayError('Customer Record has invalid ABN field', 'Please check the ABN field of the customer. Make sure they are not empty or invalid.');
            return false;
        }
        return true;
    }
}

function openSalesNoteDialog(ctx, title, subtitle, callback, needParkingLotReason = false) {
    if (!useMainStore().validateData()) return;

    ctx.salesNoteDialog.title = title;
    ctx.salesNoteDialog.subtitle = subtitle;
    ctx.salesNoteDialog.note = '';
    ctx.salesNoteDialog.pendingAction = callback;
    ctx.salesNoteDialog.open = true;
    ctx.salesNoteDialog.reasonId = null;
    ctx.salesNoteDialog.needParkingLotReason = needParkingLotReason;
}

async function promptForPortalAccess() {
    const msg = `This lead does not currently have Portal Access. <br>Would you like to set Portal Access to <b class="text-green">YES</b>?`
    let res = await new Promise(resolve => {
        useGlobalDialog().displayInfo('Portal Access', msg, true, [
            {color: 'red', variant: 'outlined', text: 'Proceed without changing', action:() => { resolve(0) }},
            'spacer',
            {color: 'green', variant: 'elevated', text: 'Set to Yes and proceed', action:() => { resolve(1) }},
        ], 550)
    });

    if (res) {
        useGlobalDialog().displayProgress('', 'Redirecting to Send Email module. Please Wait...');

        await useCustomerStore().changePortalAccess('');
    }
}


export const useCallCenter = defineStore('call-center', {
    state: () => state,
    getters,
    actions,
});
