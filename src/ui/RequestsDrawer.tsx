import { ArrowUp, X } from '@tamagui/lucide-icons'
import { useMutation, useQuery } from 'convex/react'
import { View } from 'react-native'
import { Avatar, ScrollView, Text, XStack, YStack } from 'tamagui'
import { useAuth } from '~/src/auth/AuthContext'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { getUserAvatarUrl } from '../utils/avatar'
import { formatAmount, formatRelativeTime } from '../utils/formatters'
import { AppSheet } from './AppSheet'

type RequestsDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPayRequest?: (request: {
    requestId: Id<'requests'>
    amount: string
    recipientUsername: string
    recipientAvatarUrl?: string
    recipientUserId: Id<'users'>
    note?: string
  }) => void
}

export function RequestsDrawer({
  open,
  onOpenChange,
  onPayRequest,
}: RequestsDrawerProps) {
  const { dbUser } = useAuth()
  const requests = useQuery(
    api.requests.getByUserWithDetails,
    dbUser?._id ? { userId: dbUser._id } : 'skip',
  )
  const cancelRequest = useMutation(api.requests.cancel)
  const rejectRequest = useMutation(api.requests.reject)
  const dismissRequest = useMutation(api.requests.dismiss)

  const handleCancel = async (requestId: Id<'requests'>) => {
    if (!dbUser?.privyId) return
    await cancelRequest({ privyId: dbUser.privyId, requestId })
  }

  const handleReject = async (requestId: Id<'requests'>) => {
    if (!dbUser?.privyId) return
    await rejectRequest({ privyId: dbUser.privyId, requestId })
  }

  const handleDismiss = async (requestId: Id<'requests'>) => {
    if (!dbUser?.privyId) return
    await dismissRequest({ privyId: dbUser.privyId, requestId })
  }

  const handlePay = (
    request: NonNullable<typeof requests>['asRecipient'][number],
  ) => {
    if (!request.requester) return
    onPayRequest?.({
      requestId: request._id,
      amount: request.amount,
      recipientUsername: request.requester.username || '',
      recipientAvatarUrl: request.requester.avatarUrl,
      recipientUserId: request.requesterId,
      note: request.note,
    })
    onOpenChange(false)
  }

  // Filter requests for each section
  // "requested by you" - hide cancelled and dismissed rejected requests
  const requestedByYou = (requests?.asRequester || [])
    .filter((r) => r.status !== 'cancelled' && !r.dismissedByRequester)
    .sort((a, b) => b._creationTime - a._creationTime)

  // "requested from you" - hide rejected (you rejected them)
  const requestedFromYou = (requests?.asRecipient || [])
    .filter((r) => r.status !== 'rejected')
    .sort((a, b) => b._creationTime - a._creationTime)

  const hasNoRequests =
    requestedByYou.length === 0 && requestedFromYou.length === 0

  const content = (
    <YStack flex={1} p={16}>
      <Text fontSize="$8" fontWeight="600" color="$brandGreen" mb="$4">
        requests
      </Text>

      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        style={{ marginHorizontal: -16 }}
      >
        <YStack>
          {hasNoRequests ? (
            <Text
              fontSize="$4"
              opacity={0.5}
              mt="$8"
              style={{ textAlign: 'center' }}
            >
              No requests yet
            </Text>
          ) : (
            <>
              {/* Requested BY you (you asking others for money) */}
              {requestedByYou.length > 0 && (
                <>
                  <Text
                    fontSize="$3"
                    opacity={0.5}
                    style={{ textAlign: 'center' }}
                    mb="$2"
                    mt="$2"
                  >
                    requested by you
                  </Text>
                  {requestedByYou.map((request) => {
                    const otherUser = request.recipient
                    const avatarUrl = getUserAvatarUrl(
                      otherUser?._id || 'numbies',
                      otherUser?.avatarUrl,
                    )
                    const isPending = request.status === 'pending'
                    const isRejected = request.status === 'rejected'

                    return (
                      <XStack
                        key={request._id}
                        items="center"
                        justify="space-between"
                        py="$3"
                        px="$4"
                      >
                        {/* Left: Amount + Note */}
                        <YStack>
                          <Text fontSize="$6" fontWeight="600">
                            ${formatAmount(request.amount)}
                          </Text>
                          {request.note && (
                            <Text fontSize="$3" opacity={0.6} numberOfLines={1}>
                              {request.note}
                            </Text>
                          )}
                        </YStack>

                        {/* Right: User chip with date/status inside */}
                        <XStack
                          items="center"
                          gap="$2"
                          px="$2"
                          py="$1"
                          borderWidth={2}
                          borderColor="$brandGreen"
                          style={{ borderRadius: 16 }}
                        >
                          <Avatar circular size="$2">
                            <Avatar.Image src={avatarUrl} />
                            <Avatar.Fallback bg="$color5" />
                          </Avatar>
                          <YStack>
                            <Text fontSize="$3" fontWeight="600">
                              @{otherUser?.username || 'unknown'}
                            </Text>
                            {isRejected ? (
                              <Text fontSize="$2" color="$brandRed">
                                rejected
                              </Text>
                            ) : (
                              <Text fontSize="$2" opacity={0.6}>
                                {formatRelativeTime(request._creationTime)}
                              </Text>
                            )}
                          </YStack>
                          {/* X button: cancel if pending, dismiss if rejected */}
                          {(isPending || isRejected) && (
                            <XStack
                              onPress={() =>
                                isPending
                                  ? handleCancel(request._id)
                                  : handleDismiss(request._id)
                              }
                              cursor="pointer"
                              pressStyle={{ opacity: 0.3 }}
                              opacity={0.5}
                              px="$1"
                            >
                              <X size={14} color="$color12" strokeWidth={3} />
                            </XStack>
                          )}
                        </XStack>
                      </XStack>
                    )
                  })}
                </>
              )}

              {/* Requested FROM you (others asking you for money) */}
              {requestedFromYou.length > 0 && (
                <>
                  <Text
                    fontSize="$3"
                    opacity={0.5}
                    style={{ textAlign: 'center' }}
                    mb="$2"
                    mt={requestedByYou.length > 0 ? '$4' : '$2'}
                  >
                    requested from you
                  </Text>
                  {requestedFromYou.map((request) => {
                    const otherUser = request.requester
                    const avatarUrl = getUserAvatarUrl(
                      otherUser?._id || 'numbies',
                      otherUser?.avatarUrl,
                    )
                    const isPending = request.status === 'pending'
                    const isCancelled = request.status === 'cancelled'

                    return (
                      <XStack
                        key={request._id}
                        items="center"
                        justify="space-between"
                        py="$3"
                        px="$4"
                      >
                        {/* Left: X button (reject) + Amount + Note */}
                        <XStack items="center" gap="$2">
                          {isPending && (
                            <XStack
                              onPress={() => handleReject(request._id)}
                              cursor="pointer"
                              pressStyle={{ opacity: 0.3 }}
                              opacity={0.5}
                            >
                              <X size={18} color="$color12" strokeWidth={3} />
                            </XStack>
                          )}
                          <YStack>
                            <Text fontSize="$6" fontWeight="600">
                              ${formatAmount(request.amount)}
                            </Text>
                            {request.note && (
                              <Text
                                fontSize="$3"
                                opacity={0.6}
                                numberOfLines={1}
                              >
                                {request.note}
                              </Text>
                            )}
                          </YStack>
                        </XStack>

                        {/* Right: User chip + ArrowUp (pay) */}
                        <XStack items="center" gap="$2">
                          <XStack
                            items="center"
                            gap="$2"
                            px="$2"
                            py="$1"
                            borderWidth={2}
                            borderColor="$brandGreen"
                            style={{ borderRadius: 16 }}
                          >
                            <Avatar circular size="$2">
                              <Avatar.Image src={avatarUrl} />
                              <Avatar.Fallback bg="$color5" />
                            </Avatar>
                            <YStack>
                              <Text fontSize="$3" fontWeight="600">
                                @{otherUser?.username || 'unknown'}
                              </Text>
                              {isCancelled ? (
                                <Text fontSize="$2" opacity={0.6}>
                                  cancelled
                                </Text>
                              ) : (
                                <Text fontSize="$2" opacity={0.6}>
                                  {formatRelativeTime(request._creationTime)}
                                </Text>
                              )}
                            </YStack>
                          </XStack>
                          {isPending && (
                            <XStack
                              onPress={() => handlePay(request)}
                              cursor="pointer"
                              pressStyle={{ opacity: 0.7 }}
                            >
                              <ArrowUp
                                size={24}
                                color="$brandBlue"
                                strokeWidth={3}
                              />
                            </XStack>
                          )}
                        </XStack>
                      </XStack>
                    )
                  })}
                </>
              )}
            </>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoint={80}
      tintColor="$brandGreen"
      tintOpacity={0.3}
    >
      <View style={{ flex: 1 }}>{content}</View>
    </AppSheet>
  )
}
