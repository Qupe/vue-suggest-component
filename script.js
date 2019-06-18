const API_URL = 'https://sgs.sputnik.ru'
const STORE = new Vuex.Store({
  state: {
    data: []
  },
  mutations: {
    setData (state, payload) {
      state.data = payload
    }
  },
  actions: {
    async getData ({commit}, value) {
      if (value) {
        await Vue.jsonp(API_URL, {
          type: 'regions',
          format: 'json',
          query: value,
          callbackQuery: '_',
          callbackName: 'data'
        }).then(response => {
          commit('setData', response)
        }).catch(error => {
          console.error(error)
        })
      } else {
        commit('setData', [])
      }
    }
  }
})
const C_INPUT = {
  name: 'cInput',
  props: {
    value: {
      type: String,
      default: ''
    },
    hint: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      inputValue: ''
    }
  },
  computed: {
    buttonClearVisible () {
      return !!this.inputValue
    },
    inputValueComputed () {
      return this.value || this.inputValue
    }
  },
  methods: {
    onInput (event) {
      this.$emit('update:value', event.target.value)
      this.inputValue = event.target.value
    },
    onClear () {
      this.$emit('update:value', '')
      this.inputValue = ''
    },
    onFocus (event) {
      this.$emit('input_focus', event)
    }
  },
  template:
    `<div class="c-input">
      <input
        class="c-input__field"
        :placeholder="hint"
        :value="inputValueComputed"
        @input="onInput"
        @focus="onFocus"
      />
      <div
        class="c-input__clear"
        :class="{hidden: !buttonClearVisible}"
        @click="onClear">
        &times;
        </div>
    </div>`
}
const C_DROPDOWN = {
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      contentVisible: false
    }
  },
  computed: {
    hasCallerSlot () {
      return !!this.$slots.caller
    },
    hasContentSlot () {
      return !!this.$slots.content
    },
    visibleComputed () {
      return !!this.$slots.caller ? this.contentVisible : this.visible
    }
  },
  methods: {
    onCLick (event) {
      this.contentVisible = !this.contentVisible
    },
    hideDropdown () {
      this.$emit('update:visible', this.contentVisible = false)
    }
  },
  template:
    `<div
      class="c-dropdown"
      v-click-outside="hideDropdown"
      >
      <slot/>
      <div
        class="c-dropdown__caller"
        v-if="hasCallerSlot"
        @click="onCLick">
        <slot name="caller"/>
      </div>
      <div
        class="c-dropdown__content"
        v-if="hasContentSlot"
        :class="{hidden: !visibleComputed}"
        >
        <slot name="content" />
      </div>
    </div>`
}
const C_SUGGEST = {
  components: {
    cInput: C_INPUT,
    cDropdown: C_DROPDOWN,
  },
  props: {
    inputHint: {
      type: String,
      default: ''
    }
  },
  model: {
    event: 'change'
  },
  data () {
    return {
      inputValue: '',
      dropdownVisible: false,
      hoverIndex: -1,
    }
  },
  methods: {
    itemClick (index) {
      if (this.$store.state.data[index]) {
        this.inputValue = this.$store.state.data[index].city
        this.hoverIndex = index
      }
      this.dropdownVisible = false
    },
    onInputValueChange (value) {
      this.inputValue = value
      this.$store.dispatch('getData', value).then(() => {
        this.dropdownVisible = !!this.$store.state.data.length
      })
      this.$emit('change', value)
    },
    onInputFocus (event) {
      this.dropdownVisible = !!this.inputValue
    },
    navigateItem (direction) {
      if (this.$store.state.data.length === 0) return
      if (!this.dropdownVisible) {
        this.dropdownVisible = false
        return
      }

      if (direction === 'next') {
        this.hoverIndex++
        if (this.hoverIndex === this.$store.state.data.length) {
          this.hoverIndex = 0
        }
      } else if (direction === 'prev') {
        this.hoverIndex--
        if (this.hoverIndex < 0) {
          this.hoverIndex = this.$store.state.data.length - 1
        }
      }
    },
  },
  template:
    `<div class="c-suggest">
        <c-dropdown
            :visible="dropdownVisible"
            @update:visible="(value) => {this.dropdownVisible = value}">
            <c-input
              :hint="inputHint"
              :value="inputValue"
              @update:value="onInputValueChange"
              @input_focus="onInputFocus"
              @keydown.native.esc.stop.prevent="dropdownVisible = false"
              @keydown.native.tab="dropdownVisible = false"
              @keydown.native.down.stop.prevent="navigateItem('next')"
              @keydown.native.up.stop.prevent="navigateItem('prev')"
              @keydown.native.enter.prevent="itemClick(hoverIndex)"
            />
            <ul slot="content" class="c-suggest__list">
                <li
                    class="c-suggest__item"
                    :class="{'c-suggest__item_hover': hoverIndex === index}"
                    v-for="(item, index) in $store.state.data"
                    :key="index"
                    @click="itemClick(index)"
                    v-html="$options.filters.highlight(item.city, inputValue)">
                </li>
            </ul>
        </c-dropdown>
    </div>`
}

Vue.directive('click-outside', {
  bind (el, binding, vNode) {
    el.__vueClickOutside__ = event => {
      if (!el.contains(event.target)) {
        vNode.context[binding.expression](event)
        event.stopPropagation()
      }
    }
    document.body.addEventListener('click', el.__vueClickOutside__)
  },
  unbind (el, binding, vNode) {
    document.removeEventListener('click', el.__vueClickOutside__)
    el.__vueClickOutside__ = null
  }
})

Vue.filter('highlight', (word, query) => {
  let formattedValue = query.split(' ')
  formattedValue = formattedValue[formattedValue.length - 1]
  if (formattedValue !== ' ') {
    let newQuery = formattedValue.replace(/[её]/g, '(е|ё)')
    return word.replace(new RegExp(newQuery, 'g'), '<b>' + formattedValue + '</b>')
  }
})

Vue.use(vueJsonp)

new Vue({
  el: '#app',
  store: STORE,
  components: {
    cInput: C_INPUT,
    cDropdown: C_DROPDOWN,
    cSuggest: C_SUGGEST
  },
  template: `
    <div class="app">
      <c-input hint="Input component" class="example" />
      <br/>
      <c-dropdown class="example">
        <span slot="caller">Dropdown component</span>
        <div slot="content">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ex porro praesentium repudiandae.
         Aliquam consequuntur distinctio exercitationem labore laborum. Amet dolorum, nobis odit quas quidem voluptatem!
         Aliquam blanditiis molestiae obcaecati quia?</div>
      </c-dropdown>
      <br/>
      <c-suggest input-hint="Suggest component" class="example" />
    </div>`
})
