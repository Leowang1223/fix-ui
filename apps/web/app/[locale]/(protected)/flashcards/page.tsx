'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
  type Transition,
} from 'framer-motion'
import { PlusIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline'
import { Layers } from 'lucide-react'

import {
  addCustomFlashcard,
  loadAllFlashcards as loadLocalFlashcards,
  type Flashcard as LocalFlashcard,
  getDeckNames as getLocalDeckNames,
  addDeckName as registerDeckName,
} from './utils/flashcards'
import {
  loadAllFlashcards as loadRemoteFlashcards,
  type Flashcard as RemoteFlashcard,
} from '@/utils/flashcards'
import { TTSService } from '../history/playback/services/ttsService'
import { AppButton } from '@/components/ui/AppButton'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { PageGuide } from '@/components/onboarding'

import styles from './flashcard.module.css'

interface DeckCard {
  id: string
  front: string
  pinyin?: string
  back: string
  createdAt: number
  deckName?: string
  metadata?: {
    courseId?: string
    questionIndex?: number
    source?: string
  }
}

const flipTransition: Transition = { duration: 0.6, ease: 'easeInOut' }
const dragThreshold = 140

export default function FlashcardsPage() {
  const [allCards, setAllCards] = useState<DeckCard[]>([])
  const [cards, setCards] = useState<DeckCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formValues, setFormValues] = useState({ hanzi: '', pinyin: '', english: '' })

  const [isLoading, setIsLoading] = useState(true)
  const [activeDeck, setActiveDeck] = useState<string>('all')
  const [deckNames, setDeckNames] = useState<string[]>([])
  const [showDeckForm, setShowDeckForm] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')

  const router = useRouter()
  const t = useTranslations('flashcards')
  const tGuide = useTranslations('guide')
  const tCommon = useTranslations('common')

  const x = useMotionValue(0)
  const rotateZ = useTransform(x, [-180, 0, 180], [8, 0, -8])

  const activeCard = cards[currentIndex]
  const combinedDecks = useMemo(() => {
    const set = new Set<string>()
    deckNames.forEach(name => set.add(name))
    allCards.forEach(card => {
      if (card.deckName) set.add(card.deckName)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [deckNames, allCards])

  const deckOptions = useMemo(() => ['all', ...combinedDecks], [combinedDecks])

  useEffect(() => {
    refreshCards().catch(() => null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setDeckNames(getLocalDeckNames())
  }, [])

  useEffect(() => {
    x.set(0)
    setIsFlipped(false)
  }, [currentIndex, x])

  async function refreshCards() {
    setIsLoading(true)
    try {
      const [remote, local] = await Promise.all([
        loadRemoteFlashcards().catch<RemoteFlashcard[]>(() => []),
        Promise.resolve(loadLocalFlashcards()),
      ])

      const mapped: DeckCard[] = [...remote.map(mapRemoteCard), ...local.map(mapLocalCard)]
      mapped.sort((a, b) => b.createdAt - a.createdAt)

      setAllCards(mapped)
      applyDeckFilter(mapped, activeDeck)
      setDeckNames(getLocalDeckNames())
    } finally {
      setIsLoading(false)
    }
  }

  function applyDeckFilter(list: DeckCard[], deck: string) {
    const filtered =
      deck === 'all'
        ? list
        : list.filter(card => (card.deckName || 'General').toLowerCase() === deck.toLowerCase())
    setCards(filtered)
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  function mapRemoteCard(card: RemoteFlashcard): DeckCard {
    const createdAt = card.createdAt instanceof Date ? card.createdAt.getTime() : Date.now()
    const deckName = card.metadata?.deckName || 'Synced'
    return {
      id: `api-${card.id}`,
      front: card.front ?? '',
      back: card.back ?? '',
      pinyin: undefined,
      createdAt,
      deckName,
      metadata: card.metadata,
    }
  }

  function mapLocalCard(card: LocalFlashcard): DeckCard {
    const createdAt = card.createdAt ? new Date(card.createdAt).getTime() : Date.now()
    const source = card.custom ? 'custom' : 'practice-saved'
    return {
      id: `local-${card.id}`,
      front: card.prompt || '',
      back: card.expectedAnswer || '',
      pinyin: card.pinyin,
      createdAt,
      deckName: card.deckName || (card.custom ? 'Custom Card' : 'Practice Saved'),
      metadata: {
        courseId: card.lessonId?.toString(),
        questionIndex: typeof card.questionId === 'number' ? card.questionId : undefined,
        source
      },
    }
  }

  function handleAddDeck() {
    const clean = newDeckName.trim()
    if (!clean) return
    registerDeckName(clean)
    setDeckNames(getLocalDeckNames())
    setNewDeckName('')
    setShowDeckForm(false)
    setActiveDeck(clean)
    applyDeckFilter(allCards, clean)
  }

  function handleSwipe(direction: number) {
    if (!cards.length) return
    x.stop()
    x.set(0)
    setIsFlipped(false)
    setCurrentIndex((prev) => {
      const total = cards.length
      return (prev + direction + total) % total
    })
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    const offsetX = info?.offset?.x ?? 0
    if (offsetX > dragThreshold) {
      handleSwipe(-1)
      return
    }
    if (offsetX < -dragThreshold) {
      handleSwipe(1)
      return
    }
  }

  function handleFlip() {
    if (!activeCard) return
    setIsFlipped((p) => !p)
  }

  function handlePrev() {
    handleSwipe(-1)
  }

  function handleNext() {
    handleSwipe(1)
  }

  function handlePlayAudio(card: DeckCard) {
    if (!card.front) return
    TTSService.playText(card.front)
  }

  function handleFormSubmit() {
    if (!formValues.hanzi.trim() || !formValues.english.trim()) return
    addCustomFlashcard({
      prompt: formValues.hanzi.trim(),
      expectedAnswer: formValues.english.trim(),
      pinyin: formValues.pinyin.trim() || undefined,
    })
    setFormValues({ hanzi: '', pinyin: '', english: '' })
    setIsFormOpen(false)
    refreshCards().catch(() => null)
  }

  if (isLoading && cards.length === 0) {
    return (
      <div className="flex min-h-[70vh] w-full items-center justify-center bg-gradient-to-br from-[#f7faff] via-white to-[#eef3ff]">
        <div className="text-slate-500">{tCommon('loading')}</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#f4f7ff] via-white to-[#eef1fb] py-12 px-4">
      <div className="w-full rounded-[40px] border border-white/70 bg-white/90 p-10 shadow-[0_40px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{t('practiceDeck')}</p>
            <h1 className="text-3xl font-bold text-slate-900 mt-2">{t('title')}</h1>
          </div>
          <AppButton
            className="max-w-none w-auto px-5"
            onClick={() => router.push('/dashboard')}
          >
            {t('backToDashboard')}
          </AppButton>
        </div>

        {/* Add New Card strip */}
        <button
          type="button"
          onClick={() => setIsFormOpen((prev) => !prev)}
          className="mt-6 flex w-full items-center justify-between rounded-[28px] border border-slate-100 bg-white px-5 py-4 text-left text-slate-700 shadow-inner transition hover:shadow-lg"
        >
          <span className="text-base font-semibold">{t('addNewCard')}</span>
          <PlusIcon className={`h-5 w-5 transition-transform ${isFormOpen ? 'rotate-45' : ''}`} />
        </button>

        {/* Deck selector */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {t('selectDeck')}
          </label>
          <select
            value={activeDeck}
            onChange={(e) => {
              setActiveDeck(e.target.value)
              applyDeckFilter(allCards, e.target.value)
            }}
            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {deckOptions.map(name => {
              const count =
                name === 'all'
                  ? allCards.length
                  : allCards.filter(
                      card => (card.deckName || 'General').toLowerCase() === name.toLowerCase()
                    ).length
              return (
                <option key={name} value={name}>
                  {name === 'all' ? t('allCards') : name} {t('cardCount', { count })}
                </option>
              )
            })}
          </select>
        </div>
        <div className="mt-4">
          {showDeckForm ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder={t('deckName')}
              />
              <AppButton
                className="max-w-none w-auto px-4"
                onClick={handleAddDeck}
              >
                {t('saveDeck')}
              </AppButton>
              <button
                type="button"
                onClick={() => {
                  setShowDeckForm(false)
                  setNewDeckName('')
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                {tCommon('cancel')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeckForm(true)}
              className="text-sm text-blue-600 font-semibold hover:underline"
            >
              {t('createDeck')}
            </button>
          )}
        </div>

        <AnimatePresence initial={false}>
          {isFormOpen && (
            <motion.div
              key="card-form"
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: [0.42, 0, 0.58, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl bg-white p-6 shadow-inner">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    <span>中文</span>
                    <input
                      value={formValues.hanzi}
                      onChange={(e) => setFormValues((v) => ({ ...v, hanzi: e.target.value }))}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="例如：你好"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    <span>中文拼音</span>
                    <input
                      value={formValues.pinyin}
                      onChange={(e) => setFormValues((v) => ({ ...v, pinyin: e.target.value }))}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="例如：nǐ hǎo"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-600">
                    <span>{t('englishMeaning')}</span>
                    <input
                      value={formValues.english}
                      onChange={(e) => setFormValues((v) => ({ ...v, english: e.target.value }))}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="例如：Hello"
                    />
                  </label>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleFormSubmit}
                    className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
                  >
                    {tCommon('add')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deck + 翻面 UI */}
        <div className="mt-10 w-full">
          {activeCard ? (
            <>
              <div className="relative mx-auto h-[420px] max-w-2xl rounded-[32px] bg-gradient-to-b from-slate-50 to-slate-100">
                {/* Tilt → Perspective → Flipper */}
                <div className={styles.center}>
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.22}
                    style={{ x, rotateZ }}
                    onDragEnd={handleDragEnd}
                    whileTap={{ cursor: 'grabbing' }}
                    className={styles.tilt}
                  >
                    <div className={styles.perspective}>
                      <motion.div
                        className={styles.flipper}
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={flipTransition}
                        onClick={handleFlip}
                      >
                        {/* front */}
                        <div
                          className={`${styles.face} flex flex-col justify-between bg-white px-10 py-8 text-center`}
                        >
                          <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden">
                            <p className="break-words text-4xl font-semibold leading-tight text-slate-900">
                              {activeCard.front}
                            </p>
                            {activeCard.pinyin && (
                              <p className="text-2xl text-slate-500">{activeCard.pinyin}</p>
                            )}
                          </div>
                          <div className="flex items-center justify-between px-1 text-xs uppercase tracking-wider text-slate-400">
                            <span>{activeCard.deckName || 'General'}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handlePlayAudio(activeCard)
                              }}
                              className="rounded-full bg-blue-100 p-2 text-blue-600 transition hover:bg-blue-200"
                              aria-label="Play audio"
                            >
                              <SpeakerWaveIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        {/* back */}
                        <div
                          className={`${styles.face} ${styles.back} flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-blue-50 via-white to-blue-100 px-12 text-center`}
                        >
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {t('englishMeaning')}
                          </h3>
                          <p className="text-3xl font-bold text-slate-800">{activeCard.back}</p>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Tips 卡片 */}
              <div className="mx-auto mt-6 max-w-2xl rounded-[28px] border border-slate-200/70 bg-white/70 p-6 text-sm text-slate-500 shadow-inner">
                <div className="font-semibold uppercase tracking-wide text-slate-400">{t('tips')}</div>
                <ul className="mt-3 space-y-2 text-slate-500">
                  <li>{t('tip1')}</li>
                  <li>{t('tip2')}</li>
                  <li>{t('tip3')}</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="flex h-72 w-full max-w-2xl flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-300 bg-white/70 text-center text-slate-500">
              <p>{t('noCardsReview')}</p>
              <p className="mt-2 text-sm">{t('addCardsHint')}</p>
            </div>
          )}
        </div>

        {/* controls */}
        {activeCard && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={handlePrev}
              className="h-12 rounded-xl border border-blue-300 px-6 text-base font-semibold text-blue-500 transition hover:bg-blue-50"
            >
              {tCommon('prev')}
            </button>
            <button
              type="button"
              onClick={handleFlip}
              className="h-12 rounded-xl bg-blue-600 px-8 text-base font-semibold text-white shadow-lg transition hover:bg-blue-700"
            >
              {tCommon('flip')}
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="h-12 rounded-xl border border-blue-300 px-6 text-base font-semibold text-blue-500 transition hover:bg-blue-50"
            >
              {tCommon('next')}
            </button>
          </div>
        )}

        {/* sources card */}
        <div className="mt-10 rounded-2xl bg-white/70 p-5 text-sm text-slate-600 shadow-inner">
          <div className="font-semibold text-slate-800">{t('cardSources')}</div>
          <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              {t('sourceCourse')}
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              {t('sourcePractice')}
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-300" />
              {t('sourceCustom')}
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              {t('sourceSynced')}
            </li>
          </ul>
        </div>
      </div>
      {/* First-visit feature guide */}
      <PageGuide
        pageId="flashcards"
        steps={[
          {
            title: tGuide('swipeTitle'),
            description: tGuide('swipeDesc'),
            icon: Layers,
          },
          {
            title: tGuide('createCardsTitle'),
            description: tGuide('createCardsDesc'),
            icon: PlusIcon,
          },
          {
            title: tGuide('listenTitle'),
            description: tGuide('listenDesc'),
            icon: SpeakerWaveIcon,
          },
        ]}
      />
    </div>
  )
}
