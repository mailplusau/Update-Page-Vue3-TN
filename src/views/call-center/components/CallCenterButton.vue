<script setup>
import { defineProps } from 'vue';

const props = defineProps({
    color: {
        type: String,
    },
    title: {
        type: String,
    },
    subtitle: {
        type: String,
        default: ''
    },
    prefixIcon: {
        type: String,
    },
    action: {
        type: Function
    }
})
</script>

<template>
    <v-card v-if="props.action" class="elevation-5 text-center py-2 call-center-button"
            :color="props.color" @click="props.action()">
        <p class="text-subtitle-1">
            <v-icon v-if="props.prefixIcon" size="small">{{ props.prefixIcon }}</v-icon>{{ props.title}}
        </p>
        <p class="text-caption" v-if="props.subtitle">{{ props.subtitle }}</p>
    </v-card>
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