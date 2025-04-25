import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, Typography, Card, Radio, Checkbox, Button, message, Space, Input, Form, Progress, Tag, Result, Statistic, Row, Col } from 'antd';
import http from '../../utils/request';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function PlayGame() {
    const { session_id } = useParams();
    const navigate = useNavigate();
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [selectedAnswers, setSelectedAnswers] = useState([]);
    const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, ended
    const [timeLeft, setTimeLeft] = useState(0);
    const [results, setResults] = useState(null);
    const [playerName, setPlayerName] = useState('');
    const [isNameSubmitted, setIsNameSubmitted] = useState(false);
    const [playerId, setPlayerId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [correctAnswer, setCorrectAnswer] = useState(null);
    const [answerHistory, setAnswerHistory] = useState([]);
    const [isAnswerCorrect, setIsAnswerCorrect] = useState(null);
    const [isPollingSuspended, setIsPollingSuspended] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [answerTime, setAnswerTime] = useState(0);
    const [questionScore, setQuestionScore] = useState(0);
    const [totalScore, setTotalScore] = useState(0);

    // Check if answer is correct
    const checkAnswer = (userAnswers, correctAnswers) => {
        if (!userAnswers || !correctAnswers) return false;
        
        const normalizeAnswer = (answer) => {
            if (typeof answer === 'boolean') {
                return answer.toString();
            }
            return answer;
        };

        const normalizedUserAnswers = Array.isArray(userAnswers) 
            ? userAnswers.map(normalizeAnswer).sort()
            : [normalizeAnswer(userAnswers)];
        
        const normalizedCorrectAnswers = Array.isArray(correctAnswers)
            ? correctAnswers.map(normalizeAnswer).sort()
            : [normalizeAnswer(correctAnswers)];

        if (normalizedUserAnswers.length !== normalizedCorrectAnswers.length) {
            return false;
        }

        return normalizedUserAnswers.every((answer, index) => 
            answer === normalizedCorrectAnswers[index]
        );
    };

    // Handle time up or answer submission
    const handleAnswerSubmission = useCallback(async (isTimeUp = false) => {
        if (isSubmitting || (correctAnswer !== null && showAnswer)) return;
        
        setIsSubmitting(true);
        setIsPollingSuspended(true);
        
        try {
            // Calculate answer time
            const timeUsed = startTime ? Math.round((Date.now() - startTime) / 1000) : currentQuestion.time;
            setAnswerTime(timeUsed);
            
            // Submit answer
            if (selectedAnswers.length > 0) {
                await http.put(`/play/${playerId}/answer`, {
                    answers: selectedAnswers
                });
            }
            
            // Get correct answer
            const response = await http.get(`/play/${playerId}/answer`);
            const correctAnswers = response.answers;
            
            // Update status
            setCorrectAnswer(correctAnswers);
            const isCorrect = selectedAnswers.length > 0 ? checkAnswer(selectedAnswers, correctAnswers) : false;
            setIsAnswerCorrect(isCorrect);
            
            // Calculate score
            const score = isCorrect ? Math.max(1, Math.round((currentQuestion.time - timeUsed) / 2)) : 0;
            setQuestionScore(score);
            setTotalScore(prev => prev + score);
            
            // Update answer history
            setAnswerHistory(prev => [...prev, {
                questionId: currentQuestion.id,
                question: currentQuestion.title,
                userAnswer: selectedAnswers.length > 0 ? selectedAnswers : ['No answer'],
                correctAnswer: correctAnswers,
                isCorrect,
                timeUsed,
                score
            }]);

            if (selectedAnswers.length === 0) {
                message.warning('No answer submitted, marked as incorrect');
            }
            
            // If time up auto submission, delay showing answer
            if (isTimeUp) {
                setTimeout(() => {
                    setShowAnswer(true);
                    message.info(isCorrect ? 'Correct answer!' : 'Wrong answer');
                }, 1000);
            } else {
                setShowAnswer(true);
                message.info(isCorrect ? 'Correct answer!' : 'Wrong answer');
            }
        } catch (error) {
            console.error('Failed to submit answer:', error);
            message.error('Failed to submit answer');
        } finally {
            setIsSubmitting(false);
            setTimeout(() => {
                setIsPollingSuspended(false);
            }, 1000);
        }
    }, [playerId, selectedAnswers, currentQuestion, isSubmitting, correctAnswer, showAnswer, startTime]);

    // Countdown effect
    useEffect(() => {
        let timer;
        if (gameStatus === 'playing' && timeLeft > 0 && !showAnswer) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handleAnswerSubmission(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => timer && clearInterval(timer);
    }, [gameStatus, timeLeft, handleAnswerSubmission, showAnswer]);

    // Game status polling
    useEffect(() => {
        let pollInterval;
        
        if (isNameSubmitted && playerId && !isPollingSuspended) {
            pollInterval = setInterval(async () => {
                try {
                    const response = await http.get(`/play/${playerId}/status`);
                    
                    if (response.started) {
                        setGameStatus('playing');
                        const questionResponse = await http.get(`/play/${playerId}/question`);
                        const newQuestion = questionResponse.question;
                        
                        if (!currentQuestion || currentQuestion.id !== newQuestion.id) {
                            setCurrentQuestion(newQuestion);
                            setTimeLeft(newQuestion.time);
                            setSelectedAnswers([]);
                            setCorrectAnswer(null);
                            setIsAnswerCorrect(null);
                            setStartTime(Date.now());
                        }
                    } else if (response.ended) {
                        setGameStatus('ended');
                        const resultsResponse = await http.get(`/play/${playerId}/results`);
                        setResults(resultsResponse);
                        message.success('Game ended!');
                    } else {
                        setGameStatus('waiting');
                    }
                } catch (error) {
                    console.error('Failed to get game status:', error);
                    message.error('Failed to get game status');
                }
            }, 1000);
        }
        
        return () => pollInterval && clearInterval(pollInterval);
    }, [playerId, isNameSubmitted, currentQuestion, isPollingSuspended]);

    // Listen for answer changes, auto-submit for single choice and boolean questions
    useEffect(() => {
        if (currentQuestion && 
            (currentQuestion.type === 'single' || currentQuestion.type === 'boolean') && 
            selectedAnswers.length > 0 && 
            !isSubmitting && 
            correctAnswer === null) {
            handleAnswerSubmission(false);
        }
    }, [selectedAnswers, currentQuestion, isSubmitting, correctAnswer, handleAnswerSubmission]);

    // Join game
    const handleNameSubmit = async () => {
        if (!playerName.trim()) {
            message.error('Please enter player name');
            return;
        }
        
        try {
            const response = await http.post(`/play/join/${session_id}`, {
                name: playerName.trim()
            });
            setPlayerId(response.playerId);
            setIsNameSubmitted(true);
            message.success('Successfully joined the game');
        } catch (error) {
            console.error('Failed to join game:', error);
            message.error('Failed to join game');
        }
    };

    // Render timer component
    const renderTimer = () => {
        const percent = Math.round((timeLeft / currentQuestion.time) * 100);
        const color = timeLeft > 5 ? '#1890ff' : '#ff4d4f';
        
        return (
            <Row gutter={16}>
                <Col span={16}>
                    <Progress 
                        percent={percent}
                        status={timeLeft === 0 ? 'exception' : 'active'}
                        format={() => (
                            <span style={{ color: timeLeft <= 5 ? '#ff4d4f' : undefined }}>
                                {timeLeft} seconds
                            </span>
                        )}
                        strokeColor={color}
                    />
                </Col>
                <Col span={8}>
                    <Space size="large">
                        <Statistic 
                            title="Total Score" 
                            value={totalScore} 
                            suffix="points"
                        />
                        {showAnswer && (
                            <Statistic 
                                title="Current Score" 
                                value={questionScore} 
                                suffix="points"
                                valueStyle={{ color: questionScore > 0 ? '#3f8600' : '#cf1322' }}
                            />
                        )}
                    </Space>
                </Col>
            </Row>
        );
    };

    // Render player name input
    const renderNameInput = () => (
        <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ marginBottom: '24px' }}>Join Game</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
                <Input
                    size="large"
                    placeholder="Please enter your name"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    onPressEnter={handleNameSubmit}
                    style={{ maxWidth: '400px', margin: '0 auto' }}
                />
                <Space>
                    <Button type="primary" size="large" onClick={handleNameSubmit}>
                        Join
                    </Button>
                    <Button size="large" onClick={() => navigate('/')}>
                        Back to Home
                    </Button>
                </Space>
            </Space>
        </div>
    );

    // Render waiting screen
    const renderWaitingScreen = () => (
        <div style={{ textAlign: 'center' }}>
            <Result
                title="Waiting for Game to Start"
                subTitle="Please wait for the host to start the game"
                extra={
                    <Button type="primary" size="large" onClick={() => navigate('/')}>
                        Back to Home
                    </Button>
                }
            />
        </div>
    );

    // Render question
    const renderQuestion = () => {
        if (!currentQuestion) return null;

        const handleAnswerChange = (value) => {
            if (isSubmitting || correctAnswer !== null) return;
            
            if (currentQuestion.type === 'single' || currentQuestion.type === 'boolean') {
                setSelectedAnswers([value]);
            } else {
                setSelectedAnswers(value);
            }
        };

        return (
            <div>
                <div style={{ marginBottom: '24px' }}>
                    <Title level={4}>{currentQuestion.title}</Title>
                    {currentQuestion.description && (
                        <Text style={{ display: 'block', marginTop: '8px' }}>{currentQuestion.description}</Text>
                    )}
                </div>
                
                <div style={{ marginBottom: '24px' }}>
                    {renderTimer()}
                </div>

                <div style={{ marginBottom: '24px' }}>
                    {currentQuestion.type === 'single' && (
                        <Radio.Group 
                            onChange={e => handleAnswerChange(e.target.value)}
                            value={selectedAnswers[0]}
                            disabled={isSubmitting || correctAnswer !== null}
                            style={{ width: '100%' }}
                        >
                            <Space direction="vertical" style={{ width: '100%' }}>
                                {currentQuestion.options.map((option, index) => (
                                    <Radio 
                                        key={index} 
                                        value={typeof option === 'object' ? option.text : option}
                                        style={{ 
                                            padding: '12px',
                                            border: '1px solid #d9d9d9',
                                            borderRadius: '4px',
                                            width: '100%'
                                        }}
                                    >
                                        {typeof option === 'object' ? option.text : option}
                                    </Radio>
                                ))}
                            </Space>
                        </Radio.Group>
                    )}

                    {currentQuestion.type === 'multiple' && (
                        <Checkbox.Group
                            onChange={handleAnswerChange}
                            value={selectedAnswers}
                            disabled={isSubmitting || correctAnswer !== null}
                            style={{ width: '100%' }}
                        >
                            <Space direction="vertical" style={{ width: '100%' }}>
                                {currentQuestion.options.map((option, index) => (
                                    <Checkbox 
                                        key={index} 
                                        value={typeof option === 'object' ? option.text : option}
                                        style={{ 
                                            padding: '12px',
                                            border: '1px solid #d9d9d9',
                                            borderRadius: '4px',
                                            width: '100%'
                                        }}
                                    >
                                        {typeof option === 'object' ? option.text : option}
                                    </Checkbox>
                                ))}
                            </Space>
                        </Checkbox.Group>
                    )}

                    {currentQuestion.type === 'boolean' && (
                        <Radio.Group
                            onChange={e => handleAnswerChange(e.target.value)}
                            value={selectedAnswers[0]}
                            disabled={isSubmitting || correctAnswer !== null}
                            style={{ width: '100%' }}
                        >
                            <Space style={{ width: '100%', justifyContent: 'center' }}>
                                <Radio.Button value="true" style={{ width: '120px', textAlign: 'center' }}>
                                    True
                                </Radio.Button>
                                <Radio.Button value="false" style={{ width: '120px', textAlign: 'center' }}>
                                    False
                                </Radio.Button>
                            </Space>
                        </Radio.Group>
                    )}
                </div>

                {currentQuestion.type === 'multiple' && (
                    <div style={{ textAlign: 'center' }}>
                        <Button 
                            type="primary"
                            size="large"
                            onClick={() => handleAnswerSubmission(false)}
                            disabled={isSubmitting || correctAnswer !== null || selectedAnswers.length === 0}
                        >
                            Submit Answer
                        </Button>
                    </div>
                )}

                {showAnswer && correctAnswer !== null && (
                    <div style={{ 
                        marginTop: '24px',
                        padding: '16px',
                        background: isAnswerCorrect ? '#f6ffed' : '#fff2f0',
                        borderRadius: '4px',
                        border: `1px solid ${isAnswerCorrect ? '#b7eb8f' : '#ffccc7'}`
                    }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Tag color={isAnswerCorrect ? 'success' : 'error'}>
                                {isAnswerCorrect ? 'Correct' : 'Incorrect'}
                            </Tag>
                            <Text>Time used: {answerTime} seconds</Text>
                            <Text type="secondary">
                                Correct Answer: {Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}
                            </Text>
                        </Space>
                    </div>
                )}
            </div>
        );
    };

    // Render game results
    const renderResults = () => {
        if (!results) return null;

        return (
            <div>
                <Result
                    status="success"
                    title="Game Over"
                    subTitle={`Your score: ${results.score || 0} points`}
                    extra={[
                        <Button 
                            type="primary" 
                            size="large"
                            key="back"
                            onClick={() => navigate('/')}
                        >
                            Back to Home
                        </Button>
                    ]}
                />
                <div style={{ marginTop: '24px' }}>
                    <Title level={4}>Answer History</Title>
                    {answerHistory.map((record, index) => (
                        <Card 
                            key={index} 
                            style={{ 
                                marginBottom: '16px',
                                borderColor: record.isCorrect ? '#b7eb8f' : '#ffccc7',
                                backgroundColor: record.isCorrect ? '#f6ffed' : '#fff2f0'
                            }}
                        >
                            <p><strong>Question {index + 1}:</strong> {record.question}</p>
                            <p>Your answer: {record.userAnswer.join(', ')}</p>
                            <p>Correct answer: {record.correctAnswer.join(', ')}</p>
                            <Tag color={record.isCorrect ? 'success' : 'error'}>
                                {record.isCorrect ? 'Correct' : 'Incorrect'}
                            </Tag>
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: '#fff', 
                padding: '0 24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                position: 'sticky',
                top: 0,
                zIndex: 1
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Title level={3} style={{ margin: 0, color: '#1890ff' }}>BigBrain</Title>
                    {isNameSubmitted && (
                        <Text type="secondary">Player: {playerName}</Text>
                    )}
                </div>
                {isNameSubmitted && (
                    <Button onClick={() => navigate('/')}>
                        Back to Home
                    </Button>
                )}
            </Header>
            <Content style={{ 
                padding: '24px',
                background: '#f0f2f5',
                minHeight: 'calc(100vh - 64px)'
            }}>
                <div style={{ 
                    maxWidth: '800px', 
                    margin: '0 auto',
                    padding: '24px',
                    background: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    {!isNameSubmitted && renderNameInput()}
                    {isNameSubmitted && gameStatus === 'waiting' && renderWaitingScreen()}
                    {gameStatus === 'playing' && renderQuestion()}
                    {gameStatus === 'ended' && renderResults()}
                </div>
            </Content>
        </Layout>
    );
} 