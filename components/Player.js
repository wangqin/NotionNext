import { siteConfig } from '@/lib/config'
import { loadExternalResource } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

/**
 * 音乐播放器（适配浏览器自动播放策略）
 * @returns
 */
const Player = () => {
  const [player, setPlayer] = useState()
  const ref = useRef(null)
  const lrcType = JSON.parse(siteConfig('MUSIC_PLAYER_LRC_TYPE'))
  const playerVisible = JSON.parse(siteConfig('MUSIC_PLAYER_VISIBLE'))
  const autoPlay = JSON.parse(siteConfig('MUSIC_PLAYER_AUTO_PLAY'))
  const meting = JSON.parse(siteConfig('MUSIC_PLAYER_METING'))
  const order = siteConfig('MUSIC_PLAYER_ORDER')
  const audio = siteConfig('MUSIC_PLAYER_AUDIO_LIST')

  const musicPlayerEnable = siteConfig('MUSIC_PLAYER')
  const musicPlayerCDN = siteConfig('MUSIC_PLAYER_CDN_URL')
  const musicMetingEnable = siteConfig('MUSIC_PLAYER_METING')
  const musicMetingCDNUrl = siteConfig(
    'MUSIC_PLAYER_METING_CDN_URL',
    'https://cdnjs.cloudflare.com/ajax/libs/meting/2.0.1/Meting.min.js'
  )

  // 标记是否已完成用户交互初始化
  const hasInitiated = useRef(false)

  // 初始化播放器核心逻辑
  const initMusicPlayer = async () => {
    if (!musicPlayerEnable || hasInitiated.current) return
    hasInitiated.current = true // 防止重复初始化

    try {
      // 加载APlayer核心JS
      await loadExternalResource(musicPlayerCDN, 'js')
      // 如需MetingJS则加载
      if (musicMetingEnable) {
        await loadExternalResource(musicMetingCDNUrl, 'js')
      }

      // 非Meting模式：初始化APlayer实例
      if (!meting && window.APlayer) {
        const aPlayerInstance = new window.APlayer({
          container: ref.current,
          fixed: true,
          lrcType: lrcType,
          autoplay: autoPlay, // 此时用户已交互，自动播放可生效
          order: order,
          audio: audio
        })
        setPlayer(aPlayerInstance)
        
        // 兜底：如果自动播放仍未触发，主动调用play
        if (autoPlay) {
          setTimeout(() => {
            aPlayerInstance.play().catch(err => {
              console.warn('自动播放兜底触发失败', err)
            })
          }, 500)
        }
      }

      // Meting模式：MetingJS会自动处理，但需确保交互后渲染
      if (meting && window.MetingJS) {
        // 强制重新渲染meting-js组件（触发内部初始化）
        const metingEl = document.querySelector('meting-js')
        if (metingEl) {
          metingEl.setAttribute('autoplay', 'true')
          metingEl.reload() // MetingJS内置方法，重新加载播放列表
        }
      }
    } catch (error) {
      console.error('音乐组件初始化异常', error)
    }
  }

  // 监听用户首次交互（点击/滚动/触摸）
  const listenUserInteraction = () => {
    // 定义交互事件类型
    const events = ['click', 'touchstart', 'scroll', 'keydown']
    
    // 绑定事件（触发后立即解绑，避免重复执行）
    const handleInteraction = () => {
      initMusicPlayer()
      // 解绑所有事件
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction)
      })
    }

    // 绑定事件到document
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true }) // once: true 确保只执行一次
    })
  }

  // 组件挂载时启动监听
  useEffect(() => {
    if (!musicPlayerEnable) return
    
    // 先启动用户交互监听
    listenUserInteraction()

    // 组件卸载时清理播放器
    return () => {
      if (player) {
        player.destroy() // 销毁APlayer实例，释放资源
      }
      setPlayer(undefined)
      hasInitiated.current = false // 重置标记
    }
  }, [musicPlayerEnable])

  return (
    <div className={playerVisible ? 'visible' : 'invisible'}>
      {/* 加载APlayer样式 */}
      <link
        rel='stylesheet'
        type='text/css'
        href='https://cdn.jsdelivr.net/npm/aplayer@1.10.0/dist/APlayer.min.css'
      />
      {/* Meting模式 */}
      {meting ? (
        <meting-js
          fixed='true'
          type='playlist'
          preload='auto'
          api={siteConfig(
            'MUSIC_PLAYER_METING_API',
            'https://api.i-meto.com/meting/api?server=:server&type=:type&id=:id&r=:r'
          )}
          autoplay={autoPlay}
          order={siteConfig('MUSIC_PLAYER_ORDER')}
          server={siteConfig('MUSIC_PLAYER_METING_SERVER')}
          id={siteConfig('MUSIC_PLAYER_METING_ID')}
        />
      ) : (
        // 非Meting模式（自定义音频列表）
        <div ref={ref} data-player={player} />
      )}
    </div>
  )
}

export default Player
