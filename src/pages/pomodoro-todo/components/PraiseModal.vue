<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="close">
      <div class="modal-card">
        <button type="button" class="modal-close" @click="close" aria-label="关闭">
          <svg viewBox="0 0 24 24" class="close-svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>
        <p class="modal-text">{{ message }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const MESSAGES = [
  '真厉害，你又悄悄完成了一件小事。',
  '这一步走得很稳，值得为自己点个赞。',
  '慢慢来也很好，你今天又多了一份踏实。',
  '勾选的那一刻，世界都轻了一点点。',
  '你做到了，这份坚持本身就很温柔。',
  '又清掉一项啦，给自己留一点小得意吧。',
  '完成的感觉一定很舒服，继续慢慢来。',
  '小事也值得被看见，你做得很好。',
  '清单上少一行，心里就多一寸光亮。',
  '谢谢你认真对待自己，这一步特别美。',
  '不着急、不勉强，你一直在进步。',
  '这一笔勾得很漂亮，休息一下吧。',
  '你比想象中更能把事情做完，真棒。',
  '今天的你，又温柔地推进了一点点。',
  '完成啦，像喝了一口温热的茶那样刚好。'
]

const props = defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const visible = ref(false)
const message = ref('')
let timer = 0

watch(() => props.show, (val) => {
  if (val) {
    message.value = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
    visible.value = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      visible.value = false
      emit('close')
    }, 5000)
  }
})

function close() {
  clearTimeout(timer)
  visible.value = false
  emit('close')
}

onUnmounted(() => {
  clearTimeout(timer)
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 2rem;
  background: rgba(7, 17, 31, 0.5);
  backdrop-filter: blur(2px);
}

.modal-card {
  position: relative;
  width: 100%;
  max-width: 24rem;
  border-radius: 1.75rem;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.95);
  padding: 1.25rem 1.25rem 1.5rem;
  text-align: center;
  box-shadow: 0 24px 70px rgba(4, 12, 24, 0.28);
  backdrop-filter: blur(12px);
}

.modal-close {
  position: absolute;
  right: 0.5rem;
  top: 0.5rem;
  display: grid;
  height: 2.25rem;
  width: 2.25rem;
  place-items: center;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #a8a29e;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.modal-close:hover {
  background: #f5f5f4;
  color: #57534e;
}

.close-svg {
  height: 1.25rem;
  width: 1.25rem;
}

.modal-text {
  padding-right: 2rem;
  font-size: 1rem;
  line-height: 1.625;
  color: #47413c;
  margin: 0;
}
</style>
