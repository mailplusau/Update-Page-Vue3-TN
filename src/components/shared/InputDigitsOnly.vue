<script setup>
import {defineModel, computed} from "vue";
const model = defineModel({
    required: true,
});

const internalModel = computed({
    get() {
        return model.value;
    },
    set(val) {
        model.value = val.replace(/\D/gi, '');
    }
})

const props = defineProps({
    readonly: {
        type: Boolean,
        default: false,
    },
    label: {
        type: String,
    },
    prefix: {
        type: String,
    },
    rules: {
        type: Array,
    },
    variant: {
        type: String,
    },
    color: {
        type: String,
    },
    density: {
        type: String,
    },
    disabled: {
        type: Boolean,
        default: false,
    }
})
</script>

<template>
    <v-text-field v-bind="props" v-model="internalModel"></v-text-field>
</template>

<style scoped>

</style>