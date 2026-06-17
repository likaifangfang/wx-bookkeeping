// pages/record/record.js
const app = getApp()
const store = require('../../store/index')
const categoryService = require('../../services/category')
const recordService = require('../../services/record')
const dateUtil = require('../../utils/date')

Page({
  data: {
    currentLedger: null,
    categories: [],
    expenseCategories: [],
    incomeCategories: [],
    isEdit: false,
    editId: '',
    todayStr: '',         // picker 的 end 边界
    form: {
      type: 'expense',
      amount: '0',
      category_id: '',
      category_name: '',
      category_icon: '',
      category_color: '',
      record_date: null,
      record_date_str: '',  // picker 的 value (yyyy-MM-dd)
      date_label: '今天',
      note: '',
      images: []          // 图片 fileID 数组
    }
  },

  async onLoad(options) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    this.setData({
      todayStr: dateUtil.formatDate(today, 'yyyy-MM-dd'),
      'form.record_date': today,
      'form.record_date_str': dateUtil.formatDate(today, 'yyyy-MM-dd'),
      'form.date_label': '今天'
    })

    const ledger = store.getState('currentLedger')
    if (!ledger) {
      this._unsub = store.subscribe('currentLedger', l => {
        if (!l) return
        this.setData({ currentLedger: l })
        this.loadCategories(l._id)
      })
    } else {
      this.setData({ currentLedger: ledger })
      await this.loadCategories(ledger._id)
    }

    // 编辑模式
    if (options && options.id) {
      this.setData({ isEdit: true, editId: options.id })
      wx.setNavigationBarTitle({ title: '编辑账单' })
      await this.loadRecord(options.id)
    }
  },

  onUnload() {
    if (this._unsub) this._unsub()
  },

  async loadCategories(ledger_id) {
    try {
      // 优先用 store 缓存（同一账本时不重复请求）
      const cached = store.getState('categories')
      const cachedLedgerId = store.getState('_categoriesLedgerId')
      if (cached && cachedLedgerId === ledger_id && (cached.expense.length || cached.income.length)) {
        this.setData({
          expenseCategories: cached.expense,
          incomeCategories: cached.income,
          categories: this.data.form.type === 'expense' ? cached.expense : cached.income
        })
        return
      }

      const { expense, income } = await categoryService.list(ledger_id)
      store.setState('categories', { expense, income })
      store.setState('_categoriesLedgerId', ledger_id)
      this.setData({
        expenseCategories: expense,
        incomeCategories: income,
        categories: this.data.form.type === 'expense' ? expense : income
      })
    } catch (e) {
      console.error('加载分类失败', e)
    }
  },

  /** 编辑模式:加载已有账单 */
  async loadRecord(id) {
    try {
      const r = await recordService.get(id)
      const d = new Date(r.record_date)
      d.setHours(0, 0, 0, 0)
      const dateStr = dateUtil.formatDate(d, 'yyyy-MM-dd')
      this.setData({
        'form.type': r.type,
        'form.amount': String(r.amount),
        'form.category_id': r.category_id,
        'form.category_name': r.category_name,
        'form.category_icon': r.category_icon,
        'form.category_color': r.category_color,
        'form.record_date': d,
        'form.record_date_str': dateStr,
        'form.date_label': this.makeDateLabel(d),
        'form.note': r.note || '',
        'form.images': Array.isArray(r.images) ? r.images : [],
        categories: r.type === 'expense' ? this.data.expenseCategories : this.data.incomeCategories
      })
    } catch (e) {
      console.error('加载账单失败', e)
    }
  },

  switchType(e) {
    const type = e.currentTarget.dataset.type
    if (type === this.data.form.type) return
    this.setData({
      'form.type': type,
      'form.category_id': '',
      categories: type === 'expense' ? this.data.expenseCategories : this.data.incomeCategories
    })
  },

  selectCategory(e) {
    const { id, name, icon, color } = e.currentTarget.dataset
    this.setData({
      'form.category_id': id,
      'form.category_name': name,
      'form.category_icon': icon,
      'form.category_color': color
    })
  },

  onKey(e) {
    const k = e.currentTarget.dataset.k
    let amount = this.data.form.amount

    if (k === 'back') {
      amount = amount.length > 1 ? amount.slice(0, -1) : '0'
    } else if (k === '.') {
      if (!amount.includes('.')) amount += '.'
    } else if (k === '00') {
      if (amount === '0') return
      if (this.exceedsDecimal(amount + '00')) return
      amount += '00'
    } else {
      if (this.exceedsDecimal(amount + k)) return
      amount = amount === '0' ? k : amount + k
    }
    if (amount.length > 10) return
    this.setData({ 'form.amount': amount })
  },

  exceedsDecimal(str) {
    const idx = str.indexOf('.')
    if (idx === -1) return false
    return str.length - idx - 1 > 2
  },

  onNoteInput(e) {
    this.setData({ 'form.note': e.detail.value })
  },

  /** 选择图片 */
  async chooseImage() {
    const remaining = 3 - this.data.form.images.length
    if (remaining <= 0) return
    try {
      const res = await wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed']
      })
      // 二次压缩并上传
      const files = res.tempFiles
      const images = [...this.data.form.images]
      wx.showLoading({ title: '上传中', mask: true })
      try {
        for (const f of files) {
          const compressedPath = await this.compressImage(f.tempFilePath)
          const fileID = await this.uploadImage(compressedPath)
          images.push(fileID)
        }
        this.setData({ 'form.images': images })
      } finally {
        wx.hideLoading()
      }
    } catch (e) {
      if (e && e.errMsg && e.errMsg.indexOf('cancel') < 0) {
        wx.showToast({ title: '上传失败', icon: 'none' })
        console.error('上传图片失败', e)
      }
    }
  },

  /** 压缩图片 */
  compressImage(src) {
    return new Promise((resolve) => {
      wx.compressImage({
        src,
        quality: 60,
        success: r => resolve(r.tempFilePath),
        fail: () => resolve(src)  // 压缩失败则使用原图
      })
    })
  },

  /** 上传图片到云存储 */
  async uploadImage(filePath) {
    const user = store.getState('user')
    const openid = (user && user._openid) || 'anon'
    const ext = (filePath.match(/\.(\w+)$/) || [, 'jpg'])[1]
    const cloudPath = `records/${openid}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
    const res = await wx.cloud.uploadFile({ cloudPath, filePath })
    return res.fileID
  },

  /** 删除图片 */
  removeImage(e) {
    const index = e.currentTarget.dataset.index
    const images = [...this.data.form.images]
    const removed = images.splice(index, 1)[0]
    this.setData({ 'form.images': images })
    // 后台删云存储里的文件（失败不影响主流程）
    if (removed && removed.startsWith('cloud://')) {
      wx.cloud.deleteFile({ fileList: [removed] }).catch(() => {})
    }
  },

  /** 预览图片大图 */
  previewImage(e) {
    const src = e.currentTarget.dataset.src
    wx.previewImage({
      urls: this.data.form.images,
      current: src
    })
  },

  /** picker mode=date 的 change 事件 */
  onDateChange(e) {
    const dateStr = e.detail.value
    const d = new Date(dateStr + 'T00:00:00')
    this.setData({
      'form.record_date': d,
      'form.record_date_str': dateStr,
      'form.date_label': this.makeDateLabel(d)
    })
  },

  /** 数字键盘上的"日期"快捷键 -- 触发系统 picker */
  pickDate() {
    // picker 不能程序化触发,改成 actionSheet 提供"今天/昨天/前天"快捷选项
    wx.showActionSheet({
      itemList: ['今天', '昨天', '前天'],
      success: (res) => {
        const offset = res.tapIndex
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        d.setDate(d.getDate() - offset)
        const dateStr = dateUtil.formatDate(d, 'yyyy-MM-dd')
        this.setData({
          'form.record_date': d,
          'form.record_date_str': dateStr,
          'form.date_label': ['今天', '昨天', '前天'][offset]
        })
      }
    })
  },

  /** 把 Date 对象转成"今天/昨天/M月d日"友好标签 */
  makeDateLabel(d) {
    const friendly = dateUtil.friendlyDate(d)
    if (friendly === '今天' || friendly === '昨天') return friendly
    if (d.getFullYear() === new Date().getFullYear()) {
      return dateUtil.formatDate(d, 'M月d日')
    }
    return dateUtil.formatDate(d, 'yyyy年M月d日')
  },

  async save() {
    const { form, currentLedger, isEdit, editId } = this.data
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) {
      wx.showToast({ title: '请输入金额', icon: 'none' })
      return
    }
    if (!form.category_id) {
      wx.showToast({ title: '请选择分类', icon: 'none' })
      return
    }
    if (!currentLedger) {
      wx.showToast({ title: '账本未就绪', icon: 'none' })
      return
    }
    try {
      if (isEdit) {
        await recordService.update(editId, {
          type: form.type,
          amount,
          category_id: form.category_id,
          note: form.note,
          images: form.images,
          record_date: form.record_date
        })
        wx.showToast({ title: '已更新', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 600)
      } else {
        await recordService.create({
          ledger_id: currentLedger._id,
          type: form.type,
          amount,
          category_id: form.category_id,
          note: form.note,
          images: form.images,
          record_date: form.record_date
        })
        wx.showToast({ title: '已记录', icon: 'success' })
        setTimeout(() => {
          this.setData({ 'form.amount': '0', 'form.note': '', 'form.images': [] })
        }, 300)
      }
    } catch (e) {}
  }
})
