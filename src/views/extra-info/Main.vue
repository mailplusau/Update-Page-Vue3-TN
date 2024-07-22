<script setup>
import {ref} from 'vue';
import MiscInformation from '@/views/extra-info/tabs/MiscInformation.vue';
import {useMainStore} from '@/stores/main';
import ServicesAndPricing from '@/views/extra-info/tabs/ServicesAndPricing.vue';
import MailPlusProducts from '@/views/extra-info/tabs/MailPlusProducts.vue';
import SurveyInformation from '@/views/extra-info/tabs/SurveyInformation.vue';

const tab = ref();
const mainStore = useMainStore();
</script>

<template>
    <v-container v-if="mainStore.mode.value !== mainStore.mode.options.NEW">
        <v-row>
            <v-col cols="12" class="text-center">
                <v-tabs class="elevation-5"
                        v-model="tab"
                        bg-color="primary"
                        slider-color="yellow"
                        fixed-tabs color="red"
                        selected-class="text-yellow"
                >
                    <v-tab value="tab-1" class="caption" size="small">
                        Misc. Information
                    </v-tab>

                    <v-tab value="tab-2" class="caption" size="small">
                        Services & Pricing
                    </v-tab>

                    <v-tab value="tab-3" class="caption" size="small">
                        MP Products
                    </v-tab>

                    <v-tab value="tab-4" class="caption" size="small">
                        Survey
                    </v-tab>
                </v-tabs>

                <v-tabs-window  class="elevation-5" v-model="tab">
                    <v-tabs-window-item key="1" value="tab-1">
                        <MiscInformation />
                    </v-tabs-window-item>
                    <v-tabs-window-item key="2" value="tab-2">
                        <ServicesAndPricing />
                    </v-tabs-window-item>
                    <v-tabs-window-item key="3" value="tab-3">
                        <MailPlusProducts />
                    </v-tabs-window-item>
                    <v-tabs-window-item key="4" value="tab-4">
                        <SurveyInformation />
                    </v-tabs-window-item>
                </v-tabs-window>
            </v-col>
        </v-row>
    </v-container>
</template>

<style scoped>

</style>