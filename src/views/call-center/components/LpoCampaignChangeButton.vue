<script setup>
import {useSalesRecordStore} from '@/stores/sales-record';
import {useCallCenter} from '@/stores/call-center';

const callCenter = useCallCenter();
const salesRecordStore = useSalesRecordStore();
</script>

<template>
    <v-dialog width="500">
        <template v-slot:activator="{ props: activatorProps }">
            <v-card class="elevation-5 text-center py-2 call-center-button mb-4"
                    color="cyan" v-bind="activatorProps">
                <p class="text-subtitle-1">
                    Change campaign from {{ salesRecordStore.campaignId === 69 ? 'LPO to LPO - Bypass' : 'LPO - Bypass to LPO' }}
                </p>
            </v-card>
        </template>

        <template v-slot:default="{ isActive }">
            <v-card color="background">
                <v-card-text>
                    The current campaign will be changed from <b class="text-primary">{{ salesRecordStore.campaignId === 69 ? 'LPO to LPO - Bypass' : 'LPO - Bypass to LPO' }}</b>.
                    Do you wish to proceed?
                </v-card-text>
                <v-textarea prefix="Sales Note:" variant="outlined" density="compact" color="primary"
                            v-model="callCenter.salesNoteDialog.note" persistent-placeholder
                            class="mx-4" rows="3" placeholder="(optional)"></v-textarea>
                <v-card-actions>
                    <v-btn @click="isActive.value = false">Cancel</v-btn>
                    <v-btn color="green" @click="() => { callCenter.ccChangeLpoCampaign(); isActive.value = false; }">Proceed</v-btn>
                </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>

<style scoped>
.call-center-button > .text-subtitle-1 {
    line-height: 1.3 !important;
}

/*noinspection CssInvalidPropertyValue*/
.call-center-button > .text-caption {
    letter-spacing: 0 !important;
    text-wrap: nowrap;
}
</style>