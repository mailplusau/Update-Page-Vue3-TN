<script setup>
import {defineModel, defineProps} from 'vue';
import {useLpoCampaignStore} from '@/stores/campaign-lpo';

const lpoCampaign = useLpoCampaignStore();

const dialogOpen = defineModel({
    required: true,
});
const props = defineProps({
    campaign: {
        type: String || null,
        required: true,
    }
});

const dict = {
    LPO: {
        title: 'Convert to LPO Campaign',
        body: 'This option will close the current sales record and create a new one under the LPO campaign. Do you wish to proceed?',
        action: () => {
            lpoCampaign.convertToLPO();
            dialogOpen.value = false;
        }
    },
    LPO_BAU: {
        title: 'Convert to LPO - BAU Campaign',
        body: 'This option will close the current sales record and create a new one under the LPO - BAU campaign. Do you wish to proceed?',
        action: () => {
            lpoCampaign.convertToLPOBAU();
            dialogOpen.value = false;
        }
    },
    BAU: {
        title: 'Convert to Business As Usual',
        body: 'This option will close the current sales record and create a new one under the usual sales workflow. Do you wish to proceed?',
        action: () => {
            lpoCampaign.convertToBAU();
            dialogOpen.value = false;
        }
    }
}
</script>

<template>
    <v-dialog v-model="dialogOpen" width="500" >
        <v-card color="background" :title="dict[props.campaign].title" v-if="dict[props.campaign]">
            <v-card-text class="text-subtitle-2 text-red">
                <v-icon>mdi-alert-outline</v-icon> {{ dict[props.campaign].body }}
            </v-card-text>

            <v-card-actions>
                <v-btn color="grey" size="small" variant="elevated" @click="dialogOpen = false">Cancel</v-btn>
                <v-btn color="red" size="small" variant="elevated" @click="dict[props.campaign].action()">Proceed</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<style scoped>

</style>