<script setup>
import CallCenterButton from '@/views/call-center/components/CallCenterButton.vue';
import CampaignConversionDialog from '@/views/call-center/components/CampaignConversionDialog.vue';
import SalesNoteDialog from '@/views/call-center/components/SalesNoteDialog.vue';
import {useCallCenter} from '@/stores/call-center';
import {useCustomerStore} from '@/stores/customer';
import {useGlobalDialog} from '@/stores/global-dialog';
import {computed, ref} from 'vue';
import {useSalesRecordStore} from '@/stores/sales-record';
import {useCRStore} from '@/stores/comm-reg';
import {useLpoCampaignStore} from '@/stores/campaign-lpo';
import {useMainStore} from '@/stores/main';
import LpoCampaignChangeButton from '@/views/call-center/components/LpoCampaignChangeButton.vue';

const mainStore = useMainStore();
const callCenter = useCallCenter();
const customerStore = useCustomerStore();
const srStore = useSalesRecordStore();
const commRegStore = useCRStore();
const globalDialog = useGlobalDialog();
const lpoCampaign = useLpoCampaignStore();

const campaignConversionDialog = ref({
    open: false,
    campaign: '',
    campaignOptions: {
        LPO: 'LPO',
        BAU: 'BAU',
        LPO_BAU: 'LPO_BAU',
    }
})

const canStartFreeTrial = computed(() => {
    return commRegStore.outdatedCommencementDate
        && (!lpoCampaign.isActive || customerStore.details.custentity_mp_toll_zeevisit_memo) // franchisee visit only matters if lpo campaign is active
        && customerStore.details.custentity_terms_conditions_agree_date;
})
</script>

<template>
    <v-container class="my-10" fluid v-if="mainStore.mode.value === mainStore.mode.options.CALL_CENTER">
        <v-row justify="center">
            <v-divider></v-divider>
            <v-col cols="12" class="text-center">
                <p class="text-h5 font-weight-bold text-primary">Call Center</p>
            </v-col>
        </v-row>

        <v-row justify="center" v-if="parseInt(customerStore.details.entitystatus) === 13">
            <v-col cols="4">
                <CallCenterButton title="Go to Record Page" color="cyan-lighten-2" class="mb-4" prefix-icon="mdi-chevron-left"
                                  :action="() => { globalDialog.displayBusy('', 'Redirecting to NetSuite Record. Please wait...'); customerStore.goToRecordPage(); }"/>
            </v-col>
            <v-col cols="4">
                <CallCenterButton title="Send Email" color="cyan-lighten-2" class="mb-4"
                                  :action="() => { callCenter.ccSendNormalEmail() }"/>
            </v-col>
            <v-col cols="4">
                <CallCenterButton title="Set Appointment" color="blue-darken-4" class="mb-4"
                                  :action="() => { callCenter.ccSetAppointment() }"/>
            </v-col>
            <v-col cols="6">
                <CallCenterButton title="Gift Box Required" color="blue-darken-4" class="mb-4"
                                  :action="() => { callCenter.ccGiftBoxRequired() }"/>
            </v-col>
            <v-col cols="6">
                <CallCenterButton title="Change of Service" color="blue-darken-4" class="mb-4"
                                  :action="() => { callCenter.ccHandleChangeOfService() }"/>
            </v-col>
        </v-row>

        <v-row justify="center" v-else-if="lpoCampaign.isActive && lpoCampaign.isLastSalesWithin90Days">
            <v-col cols="6">
                <CallCenterButton title="Convert to Business As Usual" color="cyan" class="mb-4"
                                  :action="() => { campaignConversionDialog.campaign = campaignConversionDialog.campaignOptions.BAU; campaignConversionDialog.open = true }"/>
            </v-col>
            <v-col cols="6">
                <CallCenterButton title="Follow-up" subtitle="(LPO - Follow-up)" color="green-darken-2" class="mb-4"
                                  :action="() => { callCenter.ccFollowUp() }"/>
            </v-col>
            <v-col cols="6" v-if="[69, 76].includes(srStore.campaignId)"><LpoCampaignChangeButton /></v-col>
        </v-row>

        <v-row justify="center" v-else-if="lpoCampaign.isActive && !lpoCampaign.isLastSalesWithin90Days && parseInt(customerStore.details.entitystatus) === 67">
            <v-col cols="6">
                <CallCenterButton title="LPO Approve" subtitle="(Suspect - Qualified)" color="green-darken-2" class="mb-4"
                                  :action="() => { callCenter.ccApproveLpoLead() }"/>
            </v-col>
        </v-row>

        <v-row justify="center" v-else>
            <v-col cols="3">
                <CallCenterButton title="Back to Record Page" color="cyan-lighten-2" class="mb-4" prefix-icon="mdi-chevron-left"
                                  :action="() => { globalDialog.displayBusy('', 'Redirecting to NetSuite Record. Please wait...'); customerStore.goToRecordPage(); }"/>

                <CallCenterButton title="Send Email" color="cyan-lighten-2" class="mb-4"
                                  :action="() => { callCenter.ccSendNormalEmail() }"/>

                <CallCenterButton title="Set Appointment" color="blue-darken-4" class="mb-4"
                                  :action="() => { callCenter.ccSetAppointment() }"/>

                <CallCenterButton v-if="srStore.isMpPremium && [50, 66].includes(parseInt(customerStore.details.entitystatus))"
                                  title="Gift Box Required" color="blue-darken-4" class="mb-4"
                                  :action="() => { callCenter.ccGiftBoxRequired() }"/> <!-- Prospect-Quote sent (50) or Customer-to be finalised (66) -->

                <CallCenterButton title="Assign To Rep" subtitle="" color="yellow-darken-2" class="mb-4"
                                  :action="() => { callCenter.ccReassignToRep() }"/>
            </v-col>

            <v-col cols="3">
                <CallCenterButton title="Made Contact" subtitle="(Suspect - In Contact)" color="yellow-darken-2" class="mb-4"
                                  :action="() => { callCenter.ccHandleContactMade() }"/>

                <CallCenterButton title="No Answer - Phone Call" subtitle="(Suspect - No Answer)" color="yellow-darken-2" class="mb-4"
                                  :action="() => { callCenter.ccHandleNoAnswerOnPhone() }"/>

                <CallCenterButton title="No Response - Email" subtitle="(Suspect - No Answer)" color="yellow-darken-2" class="mb-4"
                                  :action="() => { callCenter.ccNoResponseEmail() }"/>

                <CallCenterButton title="Parking Lot" subtitle="(Suspect - Parking Lot)" color="yellow-darken-2" class="mb-4"
                                  :action="() => { callCenter.ccHandleOffPeak() }"/>
            </v-col>

            <v-col cols="3">
                <CallCenterButton v-if="canStartFreeTrial && 32 !== parseInt(customerStore.details.entitystatus)"
                                  title="Start Free Trial" subtitle="(Customer - Free Trial)" color="green-darken-2" class="mb-4"
                                  :action="() => { callCenter.ccStartFreeTrial() }"/>

                <CallCenterButton v-else-if="![32, 71].includes(parseInt(customerStore.details.entitystatus))"
                                  title="Free Trial" subtitle="(Customer - Free Trial Pending)" color="green-darken-2" class="mb-4"
                                  :action="() => { callCenter.ccPrepareFreeTrial() }"/>

                <CallCenterButton v-else-if="71 === parseInt(customerStore.details.entitystatus)"
                                  title="Restart Free Trial" subtitle="(Customer - Free Trial Pending)" color="yellow-darken-2" class="mb-4"
                                  :action="() => { callCenter.ccPrepareFreeTrial() }"/>

                <CallCenterButton v-if="!!customerStore.details.custentity_terms_conditions_agree_date"
                                  title="Signed" subtitle="(Customer - To be Finalised)" color="green-darken-2" class="mb-4"
                                  :action="() => { callCenter.ccSignCustomer() }"/>

                <CallCenterButton title="Quote" subtitle="(Prospect - Quote Sent)" color="green-darken-2" class="mb-4"
                                  :action="() => { callCenter.ccQuoteProspect() }"/>

                <CallCenterButton title="Qualified - In Discussion" subtitle="(Prospect - Opportunity)" color="green-darken-2" class="mb-4"
                                  :action="() => { callCenter.ccHandleQualifiedProspect() }"/>

                <template v-if="false">
                    <CallCenterButton title="Notify IT Team" color="green-darken-2" class="mb-4"
                                      :action="() => { callCenter.ccNotifyITTeam() }"/>

                    <CallCenterButton title="Quote (win-back)" color="green-darken-2" class="mb-4"
                                      :action="() => { callCenter.ccQuoteWinBack() }"/>

                    <CallCenterButton title="No sales / No contact" subtitle="(Suspect - Lost)" color="red-darken-1" class="mb-4"
                                      :action="() => { callCenter.ccHandleNoSale() }"/>
                </template>

                <CallCenterButton title="Follow-up" subtitle="(Suspect - Follow-up)" color="green-darken-2" class="mb-4"
                                  :action="() => { callCenter.ccFollowUp() }"/>
            </v-col>

            <v-col cols="3">
                <CallCenterButton title="Lost - No Response" subtitle="(Suspect - Lost)" color="red-darken-1" class="mb-4"
                                  :action="() => { callCenter.ccHandleNoAnswerEmail() }"/>

                <CallCenterButton title="Not Established" subtitle="(Suspect - Lost)" color="red-darken-1" class="mb-4"
                                  :action="() => { callCenter.ccHandleNotEstablished() }"/>

                <CallCenterButton title="Lost" subtitle="(Suspect - Lost)" color="red-darken-1" class="mb-4"
                                  :action="() => { callCenter.ccHandleNoSale() }"/>
            </v-col>

            <v-col cols="6" v-if="lpoCampaign.isActive">
                <CallCenterButton title="Convert to Business As Usual" color="cyan" class="mb-4"
                                  :action="() => { campaignConversionDialog.campaign = campaignConversionDialog.campaignOptions.BAU; campaignConversionDialog.open = true }"/>
            </v-col>

            <template v-else>
                <v-col cols="6">
                    <CallCenterButton title="Convert to LPO Campaign" color="cyan" class="mb-4"
                                      :action="() => { campaignConversionDialog.campaign = campaignConversionDialog.campaignOptions.LPO; campaignConversionDialog.open = true }"/>
                </v-col>
                <v-col cols="6">
                    <CallCenterButton title="Convert to LPO - BAU Campaign" color="cyan" class="mb-4"
                                      :action="() => { campaignConversionDialog.campaign = campaignConversionDialog.campaignOptions.LPO_BAU; campaignConversionDialog.open = true }"/>
                </v-col>
            </template>

            <v-col cols="6" v-if="[69, 76].includes(srStore.campaignId)"><LpoCampaignChangeButton /></v-col>
        </v-row>

        <SalesNoteDialog />
        <CampaignConversionDialog v-model="campaignConversionDialog.open" :campaign="campaignConversionDialog.campaign" />
    </v-container>
</template>

<style scoped>

</style>