<script setup>
import {computed, onMounted, ref} from 'vue';
import {useServiceChangesStore} from '@/stores/service-changes';
import {useCustomerStore} from '@/stores/customer';
import {useSalesRecordStore} from '@/stores/sales-record';
import {useCRStore} from '@/stores/comm-reg';
import {formatPrice} from '../../utils/utils.mjs';
import {useMainStore} from '@/stores/main';

const mainStore = useMainStore();
const customerStore = useCustomerStore();
const salesRecordStore = useSalesRecordStore();
const commRegStore = useCRStore();
const serviceChangesStore = useServiceChangesStore();
const baseUrl = 'https://' + import.meta.env.VITE_NS_REALM + '.app.netsuite.com';
const iframeDialog = ref({
    open: false,
    loading: false,
    src: '',
});

const headers = computed(() => [
    { key: 'custrecord_servicechg_service_text', title: 'Service Name', align: 'start' },
    { key: 'custrecord_servicechg_type', title: 'Type', align: 'center', sortable: false },
    { key: 'custrecord_servicechg_date_effective', title: 'Effective Date', align: 'center', sortable: false },
    { key: 'price', title: 'Price', align: 'center', sortable: false },
    { key: 'custrecord_servicechg_new_freq_text', title: 'Frequency', align: 'center', sortable: false },
])

onMounted(() => {
    if (!window.closeServiceAndPriceDialog) {
        window.closeServiceAndPriceDialog = async () => {
            iframeDialog.value.open = false;
            iframeDialog.value.src = '';
            serviceChangesStore.busy = true;
            await commRegStore.init();
            await serviceChangesStore.fetchData();
            serviceChangesStore.busy = false;
        };
    }
})

function updateService() {
    if (!top['nlapiResolveURL']) return;

    let params = JSON.stringify({
        custid: customerStore.id,
        salesrecordid: salesRecordStore.id,
        salesrep: 'T',
        closedwon: 'T',
        commreg: commRegStore.id,
    });

    iframeDialog.value.loading = true;
    iframeDialog.value.open = true;
    iframeDialog.value.src = baseUrl + top['nlapiResolveURL']('SUITELET', 'customscript_sl_test_page_tn_v2_vue', 'customdeploy_sl_test_page_tn_v2_vue') + '&standalone=T&custparam_params=' + params;
}
</script>

<template>
    <v-container v-if="mainStore.mode.value === mainStore.mode.options.FINALISE">
        <v-row>
            <v-col cols="12">
                <v-data-table
                    :headers="headers"
                    :items="serviceChangesStore.data"
                    :loading="serviceChangesStore.busy"
                    no-data-text="No Service Change to Show"
                    :items-per-page="-1"
                    class="elevation-5 bg-background"
                    :hide-default-footer="serviceChangesStore.data.length <= 10"
                    loading-text="Loading service changes..."
                    :cell-props="{ class: 'cell-text-size-11px' }"
                >
                    <template v-slot:top>
                        <v-toolbar density="compact" color="primary">
                            <h2 class="mx-4 font-weight-regular">Service Changes</h2>
                            <v-divider vertical></v-divider>
                            <span class="mx-4 text-caption text-secondary"></span>

                            <v-spacer></v-spacer>

                            <v-btn variant="elevated" color="green" class="mr-2" size="small"
                                   @click="updateService()" :disabled="serviceChangesStore.busy">
                                Update Service Changes
                            </v-btn>
                        </v-toolbar>
                    </template>

                    <template v-slot:[`item.price`]="{ item }">
                        {{ formatPrice(item.custrecord_servicechg_old_price || 0) }} -> {{ formatPrice(item.custrecord_servicechg_new_price) }}
                    </template>
                </v-data-table>
            </v-col>
        </v-row>


        <v-dialog v-model="iframeDialog.open"
                  fullscreen scrollable
                  transition="dialog-bottom-transition"
        >
            <v-card>
                <v-toolbar dark color="primary">
                    <v-toolbar-title>
                        Update Service Changes <br>
                        <p class="text-caption ma-0 text-yellow">Note: all changes made in this window is immediate.</p>
                    </v-toolbar-title>

                    <v-spacer></v-spacer>

                    <v-toolbar-items></v-toolbar-items>
                </v-toolbar>

                <v-divider></v-divider>

                <div v-show="iframeDialog.loading" class="webview-iframe text-center pt-10 background">
                    <v-progress-circular
                        indeterminate
                        color="primary"
                        size="45"
                    ></v-progress-circular>
                    <p class="mt-5">Loading. Please wait...</p>
                </div>
                <iframe v-show="!iframeDialog.loading" class="webview-iframe" :src="iframeDialog.src" @load="() => { iframeDialog.loading = false; }"></iframe>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<style scoped>
.webview-iframe {
    height: 100%;
    width: 100%;
    border: none;
    overflow: scroll;
}
</style>