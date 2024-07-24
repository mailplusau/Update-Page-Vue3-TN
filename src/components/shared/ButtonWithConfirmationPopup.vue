<script setup>
import {defineEmits} from "vue";
const emit = defineEmits(['confirmed', 'denied']);
const props = defineProps({
    readonly: {
        type: Boolean,
        default: false,
    },
    tooltip: {
        type: String,
        default: 'Are you sure?'
    },
    message: {
        type: String,
        default: 'Are you sure?'
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    closeOnContentClick: {
        type: Boolean,
        default: true,
    },
})

</script>

<template>
    <v-menu location="end" :close-on-content-click="props.closeOnContentClick">
        <template v-slot:activator="{ props: menuActivator }">
            <v-tooltip :text="props.tooltip" location="top">
                <template v-slot:activator="{ props: tooltipActivator }">
                    <slot name="activator" :activatorProps="props.disabled ? null : {...tooltipActivator, ...menuActivator}" :readonly="props.readonly"></slot>
                </template>
            </v-tooltip>
        </template>

        <v-card class="bg-primary">
            <div v-html="props.message" class="pt-3 px-4"></div>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn class="text-none" size="small" color="red" variant="elevated" @click="emit('denied')">No</v-btn>
                <v-btn class="text-none" size="small" color="green" variant="elevated" @click="emit('confirmed')">Yes</v-btn>
                <v-spacer></v-spacer>
            </v-card-actions>
        </v-card>
    </v-menu>
</template>

<style scoped>

</style>