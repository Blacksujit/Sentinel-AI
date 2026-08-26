'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Box, Container, Heading, VStack, HStack, Input, Select, Button, Text } from '@chakra-ui/react'
import { RiskTable } from '../components/table/RiskTable'
import { TableSkeleton } from '../components/table/TableSkeleton'
import { Card } from '../components/ui/Card'

interface LogsPageClientProps {
  initialLogs: any[]
  initialError?: string | null
}

export function LogsPageClient({ initialLogs, initialError }: LogsPageClientProps) {
  const isDev = process.env.NODE_ENV === 'development'
  const { getToken } = useAuth()
  if (isDev) console.log('LogsPageClient rendering with initialLogs:', initialLogs?.length || 0, 'logs')
  if (isDev) console.log('Initial error:', initialError)
  
  // Error state for retry functionality
  const [error, setError] = useState<string | null>(initialError || null)
  const [isRetrying, setIsRetrying] = useState(false)
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [decisionFilter, setDecisionFilter] = useState('all')
  const [riskLevelFilter, setRiskLevelFilter] = useState('all')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  
  // Retry functionality
  const handleRetry = async () => {
    setIsRetrying(true)
    setError(null)
    
    try {
      const token = await getToken()
      const response = await fetch('/api/logs?limit=50', {
        cache: 'no-store',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const logs = await response.json()
      if (isDev) console.log('Retry successful, fetched logs:', logs?.length || 0)
      setError(null)
      
      window.location.reload()
    } catch (err) {
      console.error('Retry failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to retry fetching logs')
    } finally {
      setIsRetrying(false)
    }
  }

  const getMinRiskScore = (level: string) => {
    switch (level) {
      case 'critical': return 0.8
      case 'high': return 0.6
      case 'medium': return 0.4
      case 'low': return 0.2
      default: return undefined
    }
  }
  
  const filteredLogs = initialLogs ? initialLogs.filter(log => {
    if (!log) return false
    
    const matchesSearch = searchTerm === '' || 
      (log.prompt && typeof log.prompt === 'string' && log.prompt.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.response && typeof log.response === 'string' && log.response.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesDecision = decisionFilter === 'all' || (log.decision && log.decision === decisionFilter)
    
    const riskScore = typeof log.final_risk_score === 'number' ? log.final_risk_score : 0
    const minScore = getMinRiskScore(riskLevelFilter)
    const matchesRiskScore = minScore === undefined || riskScore >= minScore
    
    return matchesSearch && matchesDecision && matchesRiskScore
  }) : []

  const totalPages = Math.ceil(filteredLogs.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize)

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const handleDecisionChange = (value: string) => {
    setDecisionFilter(value)
    setCurrentPage(1)
  }

  const handleRiskLevelChange = (value: string) => {
    setRiskLevelFilter(value)
    setCurrentPage(1)
  }

  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  const tableColumns = [
    { key: "id", header: "ID", width: "80px" },
    { key: "created_at", header: "Time", width: "160px" },
    { key: "final_risk_score", header: "Risk Score", width: "120px" },
    { key: "flags", header: "Flags", width: "220px" },
    { key: "confidence", header: "Confidence", width: "100px" },
    { key: "decision", header: "Decision", width: "100px" },
    { key: "action_taken", header: "Action", width: "100px" },
    { key: "actions", header: "View", width: "80px" }
  ]

  const scoreBadgeBg = (score: number) => {
    if (score >= 0.8) return 'risk.critical'
    if (score >= 0.6) return 'risk.high'
    if (score >= 0.4) return 'risk.medium'
    return 'risk.low'
  }

  const decisionBadgeBg = (decision: string) => {
    switch (decision) {
      case 'block': return 'risk.critical'
      case 'escalate': return 'risk.high'
      case 'warn': return 'risk.medium'
      case 'allow': return 'risk.low'
      default: return 'ink.soft'
    }
  }

  return (
    <>
      {/* Filters Bar */}
      <Box>
        <VStack spacing={4} align="stretch">
          <Heading size="lg" color="ink">
            Filters
          </Heading>
          <Text color="ink.soft" fontSize="sm">
            Filter risk logs by decision type, risk level, or search content
          </Text>
          <Box 
            p={6} 
            bg="paper.raised" 
            borderRadius="lg" 
            boxShadow="md"
            border="1px"
            borderColor="gray.200"
          >
            <VStack spacing={4} align="stretch">
              <HStack spacing={4} align="flex-end">
                <Box flex={2}>
                  <Input 
                    placeholder="Search prompts or responses..." 
                    size="md"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </Box>
              </HStack>
              <HStack spacing={4} align="flex-end">
                <Select 
                  placeholder="Decision" 
                  size="md" 
                  w="140px"
                  value={decisionFilter}
                  onChange={(e) => handleDecisionChange(e.target.value)}
                >
                  <option value="all">All Decisions</option>
                  <option value="allow">Allow</option>
                  <option value="warn">Warn</option>
                  <option value="block">Block</option>
                  <option value="escalate">Escalate</option>
                </Select>
                <Select 
                  placeholder="Risk Level" 
                  size="md" 
                  w="140px"
                  value={riskLevelFilter}
                  onChange={(e) => handleRiskLevelChange(e.target.value)}
                >
                  <option value="all">All Levels</option>
                  <option value="low">Low (≥0.2)</option>
                  <option value="medium">Medium (≥0.4)</option>
                  <option value="high">High (≥0.6)</option>
                  <option value="critical">Critical (≥0.8)</option>
                </Select>
                <Button colorScheme="brand" size="md" onClick={handleFilterChange}>
                  Apply Filters
                </Button>
              </HStack>
            </VStack>
          </Box>
        </VStack>
      </Box>

      {/* Error State */}
        {error && (
          <Card>
            <VStack spacing={4} py={8}>
              <Text color="risk.high" fontSize="lg" fontWeight="medium">
                Unable to load risk logs
              </Text>
              <Text color="ink.soft" fontSize="sm" textAlign="center" maxW="400px">
                {error}
              </Text>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                isLoading={isRetrying}
                loadingText="Retrying..."
              >
                Retry
              </Button>
            </VStack>
          </Card>
        )}

        {/* Logs Table */}
        <Box>
          <VStack spacing={4} align="stretch">
            <Box>
              <Heading size="lg" color="ink">
                Risk Events ({filteredLogs.length} results, Page {currentPage} of {totalPages || 1})
              </Heading>
              <Text color="ink.soft" fontSize="sm">
                Each risk log represents an AI interaction that was analyzed for safety and compliance
              </Text>
            </Box>
            
            {/* Data State */}
            {paginatedLogs.length > 0 && !error && (
            <Box 
              bg="paper.raised" 
              borderRadius="lg" 
              boxShadow="sm"
              border="1px"
              borderColor="gray.200"
              overflow="hidden"
            >
            <VStack spacing={0} align="stretch">
              {/* Table Header */}
              <HStack 
                p={4} 
                bg="paper.sunken" 
                borderBottom="1px" 
                borderColor="gray.200"
                spacing={4}
                align="center"
              >
                <Text flex="0 0 80px" fontSize="xs" fontWeight="bold" color="ink.soft" textAlign="center">
                  ID
                </Text>
                <Text flex="0 0 160px" fontSize="xs" fontWeight="bold" color="ink.soft" textAlign="left">
                  Time
                </Text>
                <Text flex="0 0 120px" fontSize="xs" fontWeight="bold" color="ink.soft" textAlign="center">
                  Risk Score
                </Text>
                <Text flex="0 0 220px" fontSize="xs" fontWeight="bold" color="ink.soft" textAlign="left">
                  Flags
                </Text>
                <Text flex="0 0 100px" fontSize="xs" fontWeight="bold" color="ink.soft" textAlign="center">
                  Confidence
                </Text>
                <Text flex="0 0 100px" fontSize="xs" fontWeight="bold" color="ink.soft" textAlign="center">
                  Decision
                </Text>
                <Text flex="0 0 100px" fontSize="xs" fontWeight="bold" color="ink.soft" textAlign="center">
                  Action
                </Text>
                <Text flex="0 0 80px" fontSize="xs" fontWeight="bold" color="ink.soft" textAlign="center">
                  View
                </Text>
              </HStack>
              
              {/* Table Rows */}
              {paginatedLogs.map((log, index) => {
                const logId = log?.id || 'Unknown'
                const createdAt = log?.created_at ? new Date(log.created_at) : new Date()
                const riskScore = typeof log?.final_risk_score === 'number' ? log.final_risk_score : 0
                const flags = Array.isArray(log?.flags) ? log.flags : []
                const confidence = typeof log?.confidence === 'number' ? log.confidence : 0
                const decision = log?.decision || 'Unknown'
                const actionTaken = log?.action_taken || 'Unknown'
                
                return (
                <HStack 
                  key={logId} 
                  p={4} 
                  borderBottom={index === paginatedLogs.length - 1 ? "none" : "1px"} 
                  borderColor="gray.100"
                  spacing={4}
                  align="center"
                  bg="paper.raised"
                  _hover={{ bg: "paper.bg" }}
                  transition="background-color 0.2s"
                >
                  <Text flex="0 0 80px" fontSize="sm" fontWeight="medium" color="ink" textAlign="center">
                    #{logId}
                  </Text>
                  <Text flex="0 0 160px" fontSize="sm" color="ink" textAlign="left">
                    {createdAt.toLocaleString()}
                  </Text>
                  <Box flex="0 0 120px" display="flex" justifyContent="center">
                    <Text 
                      fontSize="sm" 
                      fontWeight="bold"
                      px={2}
                      py={1}
                      borderRadius="md"
                      color="white"
                      bg={scoreBadgeBg(riskScore)}
                    >
                      {riskScore.toFixed(2)}
                    </Text>
                  </Box>
                  <Box flex="0 0 220px" textAlign="left">
                    <Text fontSize="sm" color="ink" noOfLines={2} wordBreak="break-word">
                      {flags.length > 0 ? flags.join(', ') : 'None'}
                    </Text>
                  </Box>
                  <Text flex="0 0 100px" fontSize="sm" color="ink" textAlign="center">
                    {(confidence * 100).toFixed(0)}%
                  </Text>
                  <Box flex="0 0 100px" display="flex" justifyContent="center">
                    <Text 
                      fontSize="sm" 
                      fontWeight="bold"
                      px={2}
                      py={1}
                      borderRadius="md"
                      color="white"
                      bg={decisionBadgeBg(decision)}
                    >
                      {decision}
                    </Text>
                  </Box>
                  <Box flex="0 0 100px" display="flex" justifyContent="center">
                    <Text 
                      fontSize="sm" 
                      fontWeight="bold"
                      px={2}
                      py={1}
                      borderRadius="md"
                      color="white"
                      bg={decisionBadgeBg(actionTaken)}
                    >
                      {actionTaken}
                    </Text>
                  </Box>
                  <Box flex="0 0 80px" display="flex" justifyContent="center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      fontSize="xs"
                      borderColor="gray.300"
                      _hover={{ bg: "paper.bg" }}
                    >
                      View
                    </Button>
                  </Box>
                </HStack>
                )
              })}
            </VStack>
          </Box>
        )}

        {/* No Results State */}
        {!error && paginatedLogs.length === 0 && filteredLogs.length === 0 && (
          <Card>
            <VStack spacing={4} py={8}>
              <Text color="ink.soft" fontSize="lg" fontWeight="medium">
                No AI interactions recorded yet.
              </Text>
              <Text color="ink.soft" fontSize="sm" textAlign="center" maxW="400px">
                Risk logs will appear here once AI interactions are analyzed. 
                These logs help track and monitor AI safety decisions.
              </Text>
            </VStack>
          </Card>
        )}

        {/* Filter No Results State */}
        {!error && paginatedLogs.length === 0 && filteredLogs.length > 0 && (
          <Card>
            <VStack spacing={4} py={8}>
              <Text color="ink.soft" fontSize="lg" fontWeight="medium">
                No logs match the selected filters.
              </Text>
              <Text color="ink.soft" fontSize="sm" textAlign="center" maxW="400px">
                Try adjusting your search terms or filter criteria to find the logs you&apos;re looking for.
              </Text>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setSearchTerm('')
                  setDecisionFilter('all')
                  setRiskLevelFilter('all')
                  setCurrentPage(1)
                }}
              >
                Clear All Filters
              </Button>
            </VStack>
          </Card>
        )}
        </VStack>
      </Box>

      {/* Pagination */}
      <Box>
        <HStack justify="center" spacing={4}>
          <Button 
            variant="outline" 
            size="md"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            isDisabled={currentPage === 1}
          >
            Previous
          </Button>
          <Text fontWeight="medium" px={4}>
            Page {currentPage} of {totalPages || 1}
          </Text>
          <Button 
            variant="outline" 
            size="md"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            isDisabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </Button>
        </HStack>
      </Box>
    </>
  )
}
